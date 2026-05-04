package services

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/verso/backy/auth"
	"github.com/verso/backy/logger"
	"github.com/verso/backy/models"
	"github.com/verso/backy/repositories"
)

// Sentinel errors for expected auth outcomes.
var (
	ErrNotBootstrapped     = errors.New("system not bootstrapped")
	ErrUserInactive        = errors.New("user account is inactive")
	ErrUserNotFound        = errors.New("user not found")
	ErrAlreadyBootstrapped = errors.New("system already bootstrapped")
	ErrInvalidRefreshToken = errors.New("invalid or expired refresh token")
)

// TokenPair holds the access and refresh tokens returned after authentication.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// AuthService handles authentication business logic.
type AuthService struct {
	userRepo      *repositories.UserRepo
	sessionRepo   *repositories.SessionRepo
	workspaceRepo *repositories.WorkspaceRepo
	spaceRepo     *repositories.SpaceRepo
}

// NewAuthService creates a new AuthService.
func NewAuthService() *AuthService {
	return &AuthService{
		userRepo:      repositories.NewUserRepo(),
		sessionRepo:   repositories.NewSessionRepo(),
		workspaceRepo: repositories.NewWorkspaceRepo(),
		spaceRepo:     repositories.NewSpaceRepo(),
	}
}

// UserRepo returns the underlying user repository (for middleware use).
func (s *AuthService) UserRepo() *repositories.UserRepo {
	return s.userRepo
}

// IsBootstrapped checks whether any users exist in the system.
func (s *AuthService) IsBootstrapped(ctx context.Context) (bool, error) {
	count, err := s.userRepo.CountUsers(ctx)
	if err != nil {
		return false, fmt.Errorf("check bootstrap state: %w", err)
	}
	return count > 0, nil
}

// BootstrapParams holds the extra fields needed for the first-time bootstrap flow.
type BootstrapParams struct {
	Name          string
	WorkspaceName string
	SpaceName     string
}

// Login authenticates a user by username or email and password.
// When the system is not yet bootstrapped (no users exist) and email is provided,
// it creates the first owner user instead of performing a normal login.
func (s *AuthService) Login(ctx context.Context, usernameOrEmail, password, email string, bootstrapParams *BootstrapParams, deviceName string) (*auth.UserResponse, *TokenPair, error) {
	bootstrapped, err := s.IsBootstrapped(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !bootstrapped && email != "" {
		return s.bootstrap(ctx, usernameOrEmail, email, password, bootstrapParams, deviceName)
	}

	if !bootstrapped {
		return nil, nil, ErrNotBootstrapped
	}

	dbUser, err := s.userRepo.FindUserByUsernameOrEmail(ctx, usernameOrEmail)
	if err != nil {
		return nil, nil, fmt.Errorf("lookup user: %w", err)
	}
	if dbUser == nil {
		return nil, nil, nil
	}

	if !dbUser.IsActive {
		return nil, nil, ErrUserInactive
	}

	passwordHash, err := s.userRepo.GetPasswordHash(ctx, dbUser.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("get password hash: %w", err)
	}

	if !auth.VerifyPassword(password, passwordHash) {
		return nil, nil, nil
	}

	uid, err := uuid.Parse(dbUser.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("parse user id: %w", err)
	}

	createdAt, err := time.Parse(time.RFC3339, dbUser.CreatedAt)
	if err != nil {
		logger.Log.Error().Str("user_id", dbUser.ID).Err(err).Msg("parse created_at")
		createdAt = time.Time{}
	}
	userResp := &auth.UserResponse{
		ID:        uid,
		Username:  dbUser.Username,
		Email:     dbUser.Email,
		Name:      dbUser.Name,
		IsOwner:   dbUser.IsOwner,
		IsActive:  dbUser.IsActive,
		CreatedAt: createdAt,
	}

	pair, err := s.createSession(ctx, dbUser.ID, deviceName)
	if err != nil {
		return nil, nil, fmt.Errorf("create session: %w", err)
	}

	return userResp, pair, nil
}

// bootstrap creates the first owner user when no users exist.
// The user creation is transactional so concurrent bootstrap attempts are
// safe — the second caller hits a unique constraint and gets an
// ErrAlreadyBootstrapped error.
func (s *AuthService) bootstrap(ctx context.Context, username, email, password string, params *BootstrapParams, deviceName string) (*auth.UserResponse, *TokenPair, error) {
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return nil, nil, fmt.Errorf("hash password: %w", err)
	}

	name := ""
	if params != nil {
		name = params.Name
	}

	userID, err := s.userRepo.CreateUser(ctx, username, email, name, passwordHash, true)
	if err != nil {
		if errors.Is(err, repositories.ErrDuplicateUser) {
			return nil, nil, ErrAlreadyBootstrapped
		}
		return nil, nil, fmt.Errorf("create bootstrap user: %w", err)
	}

	// Create workspace if provided.
	workspaceID := ""
	if params != nil && params.WorkspaceName != "" {
		workspaceSlug := slugify(params.WorkspaceName)
		w := models.Workspace{
			ID:   uuid.New().String(),
			Name: params.WorkspaceName,
			Slug: workspaceSlug,
			Icon: "",
		}
		if err := s.workspaceRepo.Insert(ctx, w); err != nil {
			logger.Log.Error().Err(err).Msg("bootstrap: failed to create workspace")
		} else {
			workspaceID = w.ID
		}
	}

	// Create space if workspace was created and space name is provided.
	if workspaceID != "" && params != nil && params.SpaceName != "" {
		spaceSlug := slugify(params.SpaceName)
		sp := models.Space{
			ID:          uuid.New().String(),
			Name:        params.SpaceName,
			Slug:        spaceSlug,
			Icon:        "",
			WorkspaceID: workspaceID,
		}
		if err := s.spaceRepo.Insert(ctx, sp); err != nil {
			logger.Log.Error().Err(err).Msg("bootstrap: failed to create space")
		}
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, nil, fmt.Errorf("parse user id: %w", err)
	}

	userResp := &auth.UserResponse{
		ID:        uid,
		Username:  username,
		Email:     email,
		Name:      name,
		IsOwner:   true,
		IsActive:  true,
		CreatedAt: time.Now(),
	}

	pair, err := s.createSession(ctx, userID, deviceName)
	if err != nil {
		return nil, nil, fmt.Errorf("create session: %w", err)
	}

	return userResp, pair, nil
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Refresh rotates a refresh token and returns new token pairs.
func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*TokenPair, error) {
	if rawRefreshToken == "" {
		return nil, fmt.Errorf("missing refresh token")
	}

	tokenHash := sha256Hash(rawRefreshToken)

	// Look up the session first for user info.
	session, err := s.sessionRepo.GetSessionByRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, fmt.Errorf("lookup session: %w", err)
	}
	if session == nil {
		// Check if this is a replay of a previously rotated or revoked token
		replayed, replayedSessionID, replayErr := s.sessionRepo.IsReplayedToken(ctx, tokenHash)
		if replayErr != nil {
			logger.Log.Error().Err(replayErr).Msg("replay token check error")
		} else if replayed && replayedSessionID != "" {
			_ = s.sessionRepo.RevokeAllSessionTokens(ctx, replayedSessionID)
		}
		return nil, ErrInvalidRefreshToken
	}

	newRawToken, newTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate new refresh token: %w", err)
	}

	refreshTTL := auth.GetRefreshTokenTTL()
	newExpiresAt := time.Now().Add(refreshTTL)

	// RotateRefreshToken uses FOR UPDATE and validates the old token hash
	// atomically, so a concurrent rotation will fail and we detect it below.
	newSessionID, err := s.sessionRepo.RotateRefreshToken(ctx, tokenHash, newTokenHash, newExpiresAt)
	if err != nil {
		// Token was consumed by a concurrent request — treat as replay
		replayed, replayedSessionID, replayErr := s.sessionRepo.IsReplayedToken(ctx, tokenHash)
		if replayErr != nil {
			logger.Log.Error().Err(replayErr).Msg("replay token check error")
		} else if replayed && replayedSessionID != "" {
			_ = s.sessionRepo.RevokeAllSessionTokens(ctx, replayedSessionID)
		}
		return nil, ErrInvalidRefreshToken
	}

	_ = s.sessionRepo.UpdateSessionLastSeen(ctx, newSessionID)

	dbUser, err := s.userRepo.GetUserByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if dbUser == nil {
		return nil, ErrUserNotFound
	}

	uid, err := uuid.Parse(dbUser.ID)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	accessToken, err := auth.GenerateAccessToken(uid, dbUser.Username, newSessionID)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: newRawToken,
	}, nil
}

// Logout revokes a refresh token and the underlying session so all access
// tokens bound to the session become invalid immediately.
func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	if rawRefreshToken == "" {
		return nil
	}

	tokenHash := sha256Hash(rawRefreshToken)

	// Look up the session associated with this token so we can revoke it too.
	session, err := s.sessionRepo.GetSessionByRefreshToken(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf("lookup session for logout: %w", err)
	}

	// Revoke the refresh token first.
	if revokeErr := s.sessionRepo.RevokeRefreshToken(ctx, tokenHash); revokeErr != nil {
		return fmt.Errorf("revoke refresh token: %w", revokeErr)
	}

	// If we found a session, also revoke the session row so ValidateSession fails.
	if session != nil {
		if revokeErr := s.sessionRepo.RevokeSession(ctx, session.ID); revokeErr != nil {
			return fmt.Errorf("revoke session: %w", revokeErr)
		}
	}

	return nil
}

// ValidateSession checks whether a session is still active (not expired, not revoked).
func (s *AuthService) ValidateSession(ctx context.Context, sessionID string) (bool, error) {
	return s.sessionRepo.IsSessionActive(ctx, sessionID)
}

// GetMe retrieves the current user by ID.
func (s *AuthService) GetMe(ctx context.Context, userID string) (*auth.UserResponse, error) {
	dbUser, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if dbUser == nil {
		return nil, ErrUserNotFound
	}

	uid, err := uuid.Parse(dbUser.ID)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	createdAt, err := time.Parse(time.RFC3339, dbUser.CreatedAt)
	if err != nil {
		logger.Log.Error().Str("user_id", dbUser.ID).Err(err).Msg("parse created_at")
		createdAt = time.Time{}
	}
	return &auth.UserResponse{
		ID:        uid,
		Username:  dbUser.Username,
		Email:     dbUser.Email,
		Name:      dbUser.Name,
		AvatarURL: dbUser.AvatarURL,
		IsOwner:   dbUser.IsOwner,
		IsActive:  dbUser.IsActive,
		CreatedAt: createdAt,
	}, nil
}

// ErrInvalidPassword is returned when the current password is incorrect.
var ErrInvalidPassword = errors.New("invalid password")

// UpdateProfile updates the user's name and avatar URL.
func (s *AuthService) UpdateProfile(ctx context.Context, userID, name, avatarURL string) error {
	return s.userRepo.UpdateUserProfile(ctx, userID, name, avatarURL)
}

// ChangePassword changes the user's password after verifying the current one.
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	passwordHash, err := s.userRepo.GetPasswordHash(ctx, userID)
	if err != nil {
		return fmt.Errorf("get password hash: %w", err)
	}
	if passwordHash == "" {
		return ErrInvalidPassword
	}

	if !auth.VerifyPassword(currentPassword, passwordHash) {
		return ErrInvalidPassword
	}

	newHash, err := auth.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("hash new password: %w", err)
	}

	return s.userRepo.UpdatePasswordHash(ctx, userID, newHash)
}

func (s *AuthService) createSession(ctx context.Context, userID string, deviceName string) (*TokenPair, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("parse user id: %w", err)
	}

	dbUser, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user for access token: %w", err)
	}
	if dbUser == nil {
		return nil, ErrUserNotFound
	}

	refreshTTL := auth.GetRefreshTokenTTL()
	sessionExpiresAt := time.Now().Add(refreshTTL)

	rawRefreshToken, refreshTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	sessionID, err := s.sessionRepo.CreateSessionWithRefreshToken(ctx, userID, sessionExpiresAt, refreshTokenHash, deviceName)
	if err != nil {
		return nil, fmt.Errorf("create session with refresh token: %w", err)
	}

	accessToken, err := auth.GenerateAccessToken(uid, dbUser.Username, sessionID)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
	}, nil
}

// GetCurrentSession retrieves the current session by ID.
func (s *AuthService) GetCurrentSession(ctx context.Context, sessionID string) (*models.AuthSession, error) {
	return s.sessionRepo.GetSessionByID(ctx, sessionID)
}

// RevokeSession revokes a session by ID.
func (s *AuthService) RevokeSession(ctx context.Context, sessionID string) error {
	return s.sessionRepo.RevokeSession(ctx, sessionID)
}

func sha256Hash(input string) string {
	hash := sha256.Sum256([]byte(input))
	return base64.RawURLEncoding.EncodeToString(hash[:])
}
