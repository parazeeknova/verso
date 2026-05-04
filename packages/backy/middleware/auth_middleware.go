package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"verso/backy/auth"
	"verso/backy/logger"
	"verso/backy/services"
)

const (
	// ContextKeyClaims is the gin context key for AccessTokenClaims.
	ContextKeyClaims = "auth_claims"
	// ContextKeyUserID is the gin context key for the authenticated user ID.
	ContextKeyUserID = "auth_user_id"
)

// AuthRequired is middleware that requires a valid access token (via cookie or Authorization header).
// It also validates that the session bound to the token is still active.
func AuthRequired(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := extractToken(c)
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "authentication required"})
			return
		}

		claims, err := auth.ValidateAccessToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "invalid or expired token"})
			return
		}

		// Verify the bound session is still active (not revoked, not expired)
		if claims.SessionID != "" {
			active, checkErr := authService.ValidateSession(c.Request.Context(), claims.SessionID)
			if checkErr != nil {
				logger.Log.Error().Str("user_id", claims.UserID).Err(checkErr).Msg("session validation error")
				c.AbortWithStatusJSON(http.StatusInternalServerError, auth.ErrorResponse{Error: "session validation failed"})
				return
			}
			if !active {
				c.AbortWithStatusJSON(http.StatusUnauthorized, auth.ErrorResponse{Error: "session expired or revoked"})
				return
			}
		}

		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeyUserID, claims.UserID)
		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	// First, try the Authorization header (Bearer token)
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	// Fall back to cookie
	token, err := c.Cookie(auth.GetAccessTokenCookieName())
	if err == nil && token != "" {
		return token
	}

	return ""
}

// GetCurrentUserID extracts the authenticated user ID from the gin context.
func GetCurrentUserID(c *gin.Context) string {
	userID, _ := c.Get(ContextKeyUserID)
	if userID == nil {
		return ""
	}
	value, ok := userID.(string)
	if !ok {
		return ""
	}
	return value
}
