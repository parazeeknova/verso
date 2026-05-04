package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"verso/backy/auth"
	"verso/backy/logger"
	"verso/backy/middleware"
	"verso/backy/services"
)

// ProfileHandlers holds HTTP handlers for profile endpoints.
type ProfileHandlers struct {
	authService *services.AuthService
}

// NewProfileHandlers creates a new ProfileHandlers.
func NewProfileHandlers(authService *services.AuthService) *ProfileHandlers {
	return &ProfileHandlers{authService: authService}
}

// RegisterRoutes registers all profile routes on the given router group.
func (h *ProfileHandlers) RegisterRoutes(rg *gin.RouterGroup) {
	profileGroup := rg.Group("/profile")
	{
		profileGroup.GET("", h.GetProfile)
		profileGroup.PUT("", h.UpdateProfile)
		profileGroup.PUT("/password", h.ChangePassword)
		profileGroup.GET("/session", h.GetSession)
		profileGroup.POST("/session/revoke", h.RevokeSession)
	}
}

// GetProfile returns the current user's profile.
func (h *ProfileHandlers) GetProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		logger.Log.Warn().Msg("get profile: no authenticated user")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	logger.Log.Debug().Str("user_id", userID).Msg("get profile requested")

	userResp, err := h.authService.GetMe(c.Request.Context(), userID)
	if err != nil {
		logger.Log.Error().Str("user_id", userID).Err(err).Msg("get profile failed")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to get profile"})
		return
	}

	logger.Log.Debug().Str("user_id", userID).Str("username", userResp.Username).Msg("get profile success")
	c.JSON(http.StatusOK, userResp)
}

// UpdateProfileRequest is the request body for updating a profile.
type UpdateProfileRequest struct {
	Name      string `json:"name" binding:"required"`
	AvatarURL string `json:"avatar_url"`
}

// UpdateProfile updates the current user's profile.
func (h *ProfileHandlers) UpdateProfile(c *gin.Context) {
	logger.Log.Debug().Str("path", c.Request.URL.Path).Str("method", c.Request.Method).Msg("update profile handler entered")

	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		logger.Log.Warn().Msg("update profile: no authenticated user")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Log.Warn().Str("user_id", userID).Err(err).Msg("update profile: invalid request body")
		c.JSON(http.StatusBadRequest, auth.ErrorResponse{Error: err.Error()})
		return
	}

	logger.Log.Debug().Str("user_id", userID).Str("name", req.Name).Bool("has_avatar", req.AvatarURL != "").Int("avatar_len", len(req.AvatarURL)).Msg("update profile requested")

	if err := h.authService.UpdateProfile(c.Request.Context(), userID, req.Name, req.AvatarURL); err != nil {
		logger.Log.Error().Str("user_id", userID).Err(err).Msg("update profile failed")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to update profile"})
		return
	}

	logger.Log.Info().Str("user_id", userID).Msg("profile updated successfully")
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ChangePasswordRequest is the request body for changing a password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword changes the current user's password.
func (h *ProfileHandlers) ChangePassword(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		logger.Log.Warn().Msg("change password: no authenticated user")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Log.Warn().Str("user_id", userID).Err(err).Msg("change password: invalid request body")
		c.JSON(http.StatusBadRequest, auth.ErrorResponse{Error: err.Error()})
		return
	}

	logger.Log.Debug().Str("user_id", userID).Msg("change password requested")

	if err := h.authService.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		if err == services.ErrInvalidPassword {
			logger.Log.Warn().Str("user_id", userID).Msg("change password failed: invalid current password")
			c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "current password is incorrect"})
			return
		}
		logger.Log.Error().Str("user_id", userID).Err(err).Msg("change password failed")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to change password"})
		return
	}

	logger.Log.Info().Str("user_id", userID).Msg("password changed successfully")
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetSession returns the current session info.
func (h *ProfileHandlers) GetSession(c *gin.Context) {
	claims, exists := c.Get(middleware.ContextKeyClaims)
	if !exists {
		logger.Log.Warn().Msg("get session: no authenticated user")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	accessClaims, ok := claims.(*auth.AccessTokenClaims)
	if !ok {
		logger.Log.Warn().Msg("get session: invalid token claims")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid token claims"})
		return
	}

	logger.Log.Debug().Str("session_id", accessClaims.SessionID).Msg("get session requested")

	session, err := h.authService.GetCurrentSession(c.Request.Context(), accessClaims.SessionID)
	if err != nil {
		logger.Log.Error().Str("session_id", accessClaims.SessionID).Err(err).Msg("get session failed")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to get session"})
		return
	}

	if session == nil {
		logger.Log.Warn().Str("session_id", accessClaims.SessionID).Msg("get session: session not found")
		c.JSON(http.StatusNotFound, auth.ErrorResponse{Error: "session not found"})
		return
	}

	logger.Log.Debug().Str("session_id", session.ID).Str("device", session.DeviceName).Msg("get session success")
	c.JSON(http.StatusOK, gin.H{
		"device_name":  session.DeviceName,
		"last_seen_at": session.LastSeenAt,
	})
}

// RevokeSession revokes the current session.
func (h *ProfileHandlers) RevokeSession(c *gin.Context) {
	claims, exists := c.Get(middleware.ContextKeyClaims)
	if !exists {
		logger.Log.Warn().Msg("revoke session: no authenticated user")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "not authenticated"})
		return
	}

	accessClaims, ok := claims.(*auth.AccessTokenClaims)
	if !ok {
		logger.Log.Warn().Msg("revoke session: invalid token claims")
		c.JSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid token claims"})
		return
	}

	logger.Log.Debug().Str("session_id", accessClaims.SessionID).Msg("revoke session requested")

	if err := h.authService.RevokeSession(c.Request.Context(), accessClaims.SessionID); err != nil {
		logger.Log.Error().Str("session_id", accessClaims.SessionID).Err(err).Msg("revoke session failed")
		c.JSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "failed to revoke session"})
		return
	}

	logger.Log.Info().Str("session_id", accessClaims.SessionID).Msg("session revoked successfully")
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
