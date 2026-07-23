package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"verso/backy/repositories"
	"verso/backy/shared/auth"
	"verso/backy/shared/logger"
)

type SessionValidator interface {
	ValidateSession(ctx context.Context, sessionID string) (bool, error)
}

const (
	ContextKeyClaims  = "auth_claims"
	ContextKeyUserID  = "auth_user_id"
	ContextKeyIsOwner = "auth_is_owner"
)

func AuthRequired(authService SessionValidator) gin.HandlerFunc {
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
		c.Set(ContextKeyIsOwner, claims.IsOwner)
		c.Next()
	}
}

func OptionalAuth(authService SessionValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := extractToken(c)
		if tokenString != "" {
			claims, err := auth.ValidateAccessToken(tokenString)
			if err == nil {
				if claims.SessionID != "" && authService != nil {
					active, checkErr := authService.ValidateSession(c.Request.Context(), claims.SessionID)
					if checkErr == nil && active {
						c.Set(ContextKeyClaims, claims)
						c.Set(ContextKeyUserID, claims.UserID)
						c.Set(ContextKeyIsOwner, claims.IsOwner)
					}
				} else {
					c.Set(ContextKeyClaims, claims)
					c.Set(ContextKeyUserID, claims.UserID)
					c.Set(ContextKeyIsOwner, claims.IsOwner)
				}
			}
		}
		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	cookie, err := c.Cookie(auth.GetAccessTokenCookieName())
	if err == nil && cookie != "" {
		return cookie
	}
	return ""
}

func GetCurrentUserID(c *gin.Context) string {
	id, _ := c.Get(ContextKeyUserID)
	if id == nil {
		return ""
	}
	return id.(string)
}

func GetCurrentClaims(c *gin.Context) *auth.AccessTokenClaims {
	claims, _ := c.Get(ContextKeyClaims)
	if claims == nil {
		return nil
	}
	return claims.(*auth.AccessTokenClaims)
}

func GetCurrentUserRole(c *gin.Context) string {
	claims := GetCurrentClaims(c)
	if claims == nil {
		return ""
	}
	return claims.Role
}

func OwnerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetCurrentClaims(c)
		if claims == nil || !claims.IsOwner {
			c.AbortWithStatusJSON(http.StatusForbidden, auth.ErrorResponse{Error: "owner access required"})
			return
		}
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetCurrentClaims(c)
		if claims == nil || (claims.Role != "owner" && claims.Role != "admin") {
			c.AbortWithStatusJSON(http.StatusForbidden, auth.ErrorResponse{Error: "admin access required"})
			return
		}
		c.Next()
	}
}

func DebugAPIRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		repo := repositories.NewSystemSettingsRepo()
		if !repo.IsEnabled(c.Request.Context(), "debug_api") {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "debug API is disabled"})
			return
		}
		c.Next()
	}
}
