package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/verso/backy/auth"
	"github.com/verso/backy/logger"
	"github.com/verso/backy/services"
)

// AuthHandlers holds HTTP handlers for authentication endpoints.
type AuthHandlers struct {
	authService *services.AuthService
}

// NewAuthHandlers creates a new AuthHandlers.
func NewAuthHandlers(authService *services.AuthService) *AuthHandlers {
	return &AuthHandlers{authService: authService}
}

// RegisterRoutes registers all auth routes on the given router group.
// Login is excluded so it can be wrapped with rate-limiting middleware.
func (h *AuthHandlers) RegisterRoutes(rg *gin.RouterGroup) {
	authGroup := rg.Group("/auth")
	{
		authGroup.GET("/bootstrap-state", h.BootstrapState)
		authGroup.POST("/refresh", h.Refresh)
		authGroup.POST("/logout", h.Logout)
		authGroup.GET("/me", h.Me)
	}
}

// BootstrapState returns whether the system has been bootstrapped.
func (h *AuthHandlers) BootstrapState(c *gin.Context) {
	bootstrapped, err := h.authService.IsBootstrapped(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to check bootstrap state"})
		return
	}

	c.JSON(http.StatusOK, auth.BootstrapStateResponse{Bootstrapped: bootstrapped})
}

// Login authenticates a user and sets auth cookies.
// When the system is not yet bootstrapped and email is provided,
// this creates the first owner user.
func (h *AuthHandlers) Login(c *gin.Context) {
	var req auth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, auth.ErrorResponse{Error: err.Error()})
		return
	}

	var bootstrapParams *services.BootstrapParams
	if req.Email != "" {
		bootstrapParams = &services.BootstrapParams{
			Name:          req.Name,
			WorkspaceName: req.WorkspaceName,
			SpaceName:     req.SpaceName,
		}
	}

	deviceName := parseDeviceName(c.GetHeader("User-Agent"))
	userResp, pair, err := h.authService.Login(c.Request.Context(), req.UsernameOrEmail, req.Password, req.Email, bootstrapParams, deviceName)
	if err != nil {
		if errors.Is(err, services.ErrNotBootstrapped) {
			c.JSON(http.StatusBadRequest, auth.ErrorResponse{Error: "system not bootstrapped"})
			return
		}
		if errors.Is(err, services.ErrUserInactive) {
			c.JSON(http.StatusForbidden, auth.ErrorResponse{Error: "user account is inactive"})
			return
		}
		if errors.Is(err, services.ErrAlreadyBootstrapped) {
			c.JSON(http.StatusConflict, auth.ErrorResponse{Error: "system already bootstrapped"})
			return
		}
		logger.Log.Error().Err(err).Msg("login error")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "authentication failed"})
		return
	}
	if userResp == nil {
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid username or password"})
		return
	}

	setAuthCookies(c, pair)
	c.JSON(http.StatusOK, auth.LoginResponse{User: *userResp})
}

// Refresh rotates the refresh token and issues new tokens.
func (h *AuthHandlers) Refresh(c *gin.Context) {
	rawToken, err := c.Cookie(auth.GetRefreshTokenCookieName())
	if err != nil {
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "missing refresh token"})
		return
	}

	pair, err := h.authService.Refresh(c.Request.Context(), rawToken)
	if err != nil {
		if errors.Is(err, services.ErrInvalidRefreshToken) {
			c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid or expired refresh token"})
			return
		}
		logger.Log.Error().Err(err).Msg("refresh error")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "token refresh failed"})
		return
	}

	setAuthCookies(c, pair)
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Logout revokes the refresh token and clears auth cookies.
func (h *AuthHandlers) Logout(c *gin.Context) {
	rawToken, _ := c.Cookie(auth.GetRefreshTokenCookieName())

	if err := h.authService.Logout(c.Request.Context(), rawToken); err != nil {
		logger.Log.Error().Err(err).Msg("logout error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke session"})
		return
	}

	clearAuthCookies(c)
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Me returns the currently authenticated user.
func (h *AuthHandlers) Me(c *gin.Context) {
	tokenString := extractAuthToken(c)
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	accessClaims, err := auth.ValidateAccessToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid or expired token"})
		return
	}

	// Verify the bound session is still active
	if accessClaims.SessionID != "" {
		active, checkErr := h.authService.ValidateSession(c.Request.Context(), accessClaims.SessionID)
		if checkErr != nil {
			logger.Log.Error().Str("user_id", accessClaims.UserID).Err(checkErr).Msg("session validation error")
			c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "session validation failed"})
			return
		}
		if !active {
			c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "session expired or revoked"})
			return
		}
	}

	userResp, err := h.authService.GetMe(c.Request.Context(), accessClaims.UserID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, auth.ErrorResponse{Error: "user not found"})
			return
		}
		logger.Log.Error().Str("user_id", accessClaims.UserID).Err(err).Msg("get me error")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to retrieve user"})
		return
	}

	c.JSON(http.StatusOK, userResp)
}

func parseDeviceName(ua string) string {
	if ua == "" {
		return "unknown device"
	}
	ua = strings.ToLower(ua)
	switch {
	case strings.Contains(ua, "edg"):
		return "edge"
	case strings.Contains(ua, "opr") || strings.Contains(ua, "opera"):
		return "opera"
	case strings.Contains(ua, "firefox"):
		return "firefox"
	case strings.Contains(ua, "safari") && !strings.Contains(ua, "chrome"):
		return "safari"
	case strings.Contains(ua, "chrome"):
		return "chrome"
	default:
		return "unknown device"
	}
}

func extractAuthToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	token, err := c.Cookie(auth.GetAccessTokenCookieName())
	if err == nil && token != "" {
		return token
	}

	return ""
}

func setAuthCookies(c *gin.Context, pair *services.TokenPair) {
	domain := auth.GetCookieDomain()
	secure := auth.GetCookieSecure()
	maxAgeAccess := int(auth.GetAccessTokenTTL().Seconds())
	maxAgeRefresh := int(auth.GetRefreshTokenTTL().Seconds())
	path := "/"
	sameSite := http.SameSiteLaxMode

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     auth.GetAccessTokenCookieName(),
		Value:    pair.AccessToken,
		MaxAge:   maxAgeAccess,
		Path:     path,
		Domain:   domain,
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     auth.GetRefreshTokenCookieName(),
		Value:    pair.RefreshToken,
		MaxAge:   maxAgeRefresh,
		Path:     path,
		Domain:   domain,
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})
}

func clearAuthCookies(c *gin.Context) {
	domain := auth.GetCookieDomain()
	secure := auth.GetCookieSecure()
	path := "/"
	sameSite := http.SameSiteLaxMode

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     auth.GetAccessTokenCookieName(),
		Value:    "",
		MaxAge:   -1,
		Path:     path,
		Domain:   domain,
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     auth.GetRefreshTokenCookieName(),
		Value:    "",
		MaxAge:   -1,
		Path:     path,
		Domain:   domain,
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})
}
