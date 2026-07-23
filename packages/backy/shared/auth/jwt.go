package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// AccessTokenClaims holds the custom claims for an access JWT.
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	UserID    string `json:"uid"`
	Username  string `json:"uname"`
	SessionID string `json:"sid"`
	Role      string `json:"role"`
	IsOwner   bool   `json:"owner"`
}

// GenerateAccessToken creates a short-lived JWT access token bound to a session.
func GenerateAccessToken(userID uuid.UUID, username, sessionID, role string) (string, error) {
	secret := getAccessTokenSecret()
	issuer := getJWTIssuer()
	audience := getJWTAudience()
	ttl := getAccessTokenTTL()

	now := time.Now()
	claims := AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   userID.String(),
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.New().String(),
		},
		UserID:    userID.String(),
		Username:  username,
		SessionID: sessionID,
		Role:      role,
		IsOwner:   role == "owner",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateAccessToken parses and validates a JWT access token string.
func ValidateAccessToken(tokenString string) (*AccessTokenClaims, error) {
	secret := getAccessTokenSecret()
	issuer := getJWTIssuer()
	audience := getJWTAudience()

	token, err := jwt.ParseWithClaims(
		tokenString,
		&AccessTokenClaims{},
		func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("parse access token: %w", err)
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid access token claims")
	}

	return claims, nil
}

func getAccessTokenSecret() string {
	secret := os.Getenv("JWT_ACCESS_TOKEN_SECRET")
	if secret == "" {
		panic("JWT_ACCESS_TOKEN_SECRET environment variable is required")
	}
	return secret
}

func getJWTIssuer() string {
	issuer := os.Getenv("JWT_ISSUER")
	if issuer == "" {
		issuer = "verso"
	}
	return issuer
}

func getJWTAudience() string {
	aud := os.Getenv("JWT_AUDIENCE")
	if aud == "" {
		aud = "verso"
	}
	return aud
}

// ValidateSecret checks that the JWT secret is strong enough at startup.
// Refuses weak defaults and secrets shorter than 32 bytes.
func ValidateSecret() error {
	secret := os.Getenv("JWT_ACCESS_TOKEN_SECRET")
	if secret == "" {
		return fmt.Errorf("JWT_ACCESS_TOKEN_SECRET is required")
	}
	if secret == "change-me-to-a-random-secret" {
		return fmt.Errorf("JWT_ACCESS_TOKEN_SECRET must not be the default example value")
	}
	if len(secret) < 32 {
		return fmt.Errorf("JWT_ACCESS_TOKEN_SECRET must be at least 32 bytes (got %d)", len(secret))
	}
	// Reject obvious non-random secrets (single character repeated)
	if isWeakSecret(secret) {
		return fmt.Errorf("JWT_ACCESS_TOKEN_SECRET appears non-random; generate with: openssl rand -base64 32")
	}
	return nil
}

func isWeakSecret(s string) bool {
	if len(s) == 0 {
		return true
	}
	first := s[0]
	for i := 1; i < len(s); i++ {
		if s[i] != first {
			return false
		}
	}
	return true
}

// GenerateSecret produces a cryptographically random base64-encoded secret.
func GenerateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate secret: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func getAccessTokenTTL() time.Duration {
	ttl := os.Getenv("ACCESS_TOKEN_TTL")
	if ttl == "" {
		ttl = "15m"
	}
	d, err := parseDuration(ttl)
	if err != nil {
		panic(fmt.Sprintf("invalid ACCESS_TOKEN_TTL: %v", err))
	}
	return d
}

// GetRefreshTokenTTL returns the configured refresh token TTL.
func GetRefreshTokenTTL() time.Duration {
	ttl := os.Getenv("REFRESH_TOKEN_TTL")
	if ttl == "" {
		ttl = "168h"
	}
	d, err := parseDuration(ttl)
	if err != nil {
		panic(fmt.Sprintf("invalid REFRESH_TOKEN_TTL: %v", err))
	}
	return d
}

// GetAccessTokenTTL returns the configured access token TTL.
func GetAccessTokenTTL() time.Duration {
	return getAccessTokenTTL()
}

// parseDuration wraps time.ParseDuration with support for "d" (days).
// Returns an error for zero or negative durations.
func parseDuration(s string) (time.Duration, error) {
	if strings.HasSuffix(s, "d") {
		daysStr := strings.TrimSuffix(s, "d")
		days, err := strconv.Atoi(daysStr)
		if err != nil {
			return 0, fmt.Errorf("invalid duration %q: %w", s, err)
		}
		if days <= 0 {
			return 0, fmt.Errorf("invalid duration %q: must be positive", s)
		}
		return time.Duration(days) * 24 * time.Hour, nil
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return 0, err
	}
	if d <= 0 {
		return 0, fmt.Errorf("invalid duration %q: must be positive", s)
	}
	return d, nil
}

// GetCookieDomain returns the cookie domain from env.
func GetCookieDomain() string {
	domain := os.Getenv("COOKIE_DOMAIN")
	if domain == "" {
		domain = "localhost"
	}
	return domain
}

// GetCookieSecure returns whether cookies should be set with Secure flag.
// When COOKIE_SECURE is not explicitly set, defaults to true for non-localhost domains.
func GetCookieSecure() bool {
	val := os.Getenv("COOKIE_SECURE")
	if val != "" {
		return val == "true"
	}
	domain := GetCookieDomain()
	return domain != "localhost" && !strings.HasPrefix(domain, "localhost")
}

// GetAccessTokenCookieName returns the cookie name for the access JWT.
func GetAccessTokenCookieName() string {
	if name := os.Getenv("ACCESS_TOKEN_COOKIE_NAME"); name != "" {
		return name
	}
	return "verso_access_token"
}

// GetRefreshTokenCookieName returns the cookie name for the refresh token.
func GetRefreshTokenCookieName() string {
	if name := os.Getenv("REFRESH_TOKEN_COOKIE_NAME"); name != "" {
		return name
	}
	return "verso_refresh_token"
}

// CollabTokenClaims holds claims for WebSocket collaboration authentication.
type CollabTokenClaims struct {
	jwt.RegisteredClaims
	UserID      string `json:"uid"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	Type        string `json:"type"` // "collab"
}

// GenerateCollabToken creates a short-lived JWT token specifically for WebSocket collaboration sync.
func GenerateCollabToken(userID uuid.UUID, workspaceID string) (string, error) {
	secret := getAccessTokenSecret()
	issuer := getJWTIssuer()
	audience := getJWTAudience()

	now := time.Now()
	ttl := 2 * time.Hour

	claims := CollabTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   userID.String(),
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.New().String(),
		},
		UserID:      userID.String(),
		WorkspaceID: workspaceID,
		Type:        "collab",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateCollabToken parses and validates a collaboration JWT token string.
func ValidateCollabToken(tokenString string) (*CollabTokenClaims, error) {
	secret := getAccessTokenSecret()
	issuer := getJWTIssuer()
	audience := getJWTAudience()

	token, err := jwt.ParseWithClaims(
		tokenString,
		&CollabTokenClaims{},
		func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("parse collab token: %w", err)
	}

	claims, ok := token.Claims.(*CollabTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid collab token claims")
	}

	if claims.Type != "collab" {
		return nil, fmt.Errorf("invalid token type for collaboration: %s", claims.Type)
	}

	return claims, nil
}
