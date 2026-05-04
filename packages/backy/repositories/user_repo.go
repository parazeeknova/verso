package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/verso/backy/database"
	"github.com/verso/backy/models"
)

// ErrDuplicateUser is returned when a user creation violates a unique constraint.
var ErrDuplicateUser = errors.New("user already exists")

// UserRepo handles database operations for the users and password_credentials tables.
type UserRepo struct {
	pool *pgxpool.Pool
}

// NewUserRepo creates a new UserRepo using the global database pool.
func NewUserRepo() *UserRepo {
	return &UserRepo{pool: database.GetPool()}
}

// CountUsers returns the total number of users in the database.
func (r *UserRepo) CountUsers(ctx context.Context) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return count, nil
}

// CreateUser inserts a new user and their password credential in a single transaction.
// Returns the newly created user's ID, or ErrDuplicateUser on unique constraint violations.
func (r *UserRepo) CreateUser(ctx context.Context, username, email, name, passwordHash string, isOwner bool) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var userID string
	err = tx.QueryRow(ctx,
		`INSERT INTO users (username, email, name, is_owner, is_active)
		 VALUES ($1, $2, $3, $4, true)
		 RETURNING id`,
		username, email, name, isOwner,
	).Scan(&userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return "", ErrDuplicateUser
		}
		return "", fmt.Errorf("insert user: %w", err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO password_credentials (user_id, password_hash)
		 VALUES ($1, $2)`,
		userID, passwordHash,
	)
	if err != nil {
		return "", fmt.Errorf("insert credential: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit tx: %w", err)
	}

	return userID, nil
}

// FindUserByUsernameOrEmail looks up a user by username first, then falls back to email.
// This avoids nondeterministic results when a username matches another user's email.
func (r *UserRepo) FindUserByUsernameOrEmail(ctx context.Context, identifier string) (*models.AuthUser, error) {
	query := `SELECT id, username, email, name, COALESCE(avatar_url, ''), is_owner, is_active,
	          COALESCE(to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	          COALESCE(to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
	          FROM users WHERE username = $1`

	var u models.AuthUser
	err := r.pool.QueryRow(ctx, query, identifier).Scan(
		&u.ID, &u.Username, &u.Email, &u.Name, &u.AvatarURL, &u.IsOwner, &u.IsActive,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err == nil {
		return &u, nil
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("find user by username: %w", err)
	}

	// No match by username, try email.
	query = `SELECT id, username, email, name, COALESCE(avatar_url, ''), is_owner, is_active,
	         COALESCE(to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	         COALESCE(to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
	         FROM users WHERE email = $1`

	err = r.pool.QueryRow(ctx, query, identifier).Scan(
		&u.ID, &u.Username, &u.Email, &u.Name, &u.AvatarURL, &u.IsOwner, &u.IsActive,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &u, nil
}

// GetUserByID retrieves a user by their UUID.
func (r *UserRepo) GetUserByID(ctx context.Context, id string) (*models.AuthUser, error) {
	query := `SELECT id, username, email, name, COALESCE(avatar_url, ''), is_owner, is_active,
	          COALESCE(to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	          COALESCE(to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
	          FROM users WHERE id = $1`

	var u models.AuthUser
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Username, &u.Email, &u.Name, &u.AvatarURL, &u.IsOwner, &u.IsActive,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

// UpdateUserProfile updates a user's name and avatar_url.
func (r *UserRepo) UpdateUserProfile(ctx context.Context, userID, name, avatarURL string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3`,
		name, avatarURL, userID,
	)
	if err != nil {
		return fmt.Errorf("update user profile: %w", err)
	}
	return nil
}

// UpdatePasswordHash updates the password hash for a user.
func (r *UserRepo) UpdatePasswordHash(ctx context.Context, userID, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE password_credentials SET password_hash = $1 WHERE user_id = $2`,
		passwordHash, userID,
	)
	if err != nil {
		return fmt.Errorf("update password hash: %w", err)
	}
	return nil
}

// GetPasswordHash retrieves the stored password hash for a user.
func (r *UserRepo) GetPasswordHash(ctx context.Context, userID string) (string, error) {
	var hash string
	err := r.pool.QueryRow(ctx,
		"SELECT password_hash FROM password_credentials WHERE user_id = $1",
		userID,
	).Scan(&hash)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", fmt.Errorf("get password hash: %w", err)
	}
	return hash, nil
}
