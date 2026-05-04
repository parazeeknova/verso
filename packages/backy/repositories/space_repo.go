package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database"
	"verso/backy/models"
)

var (
	ErrSpaceNotFound = errors.New("space not found")
	ErrSpaceNotEmpty = errors.New("space is not empty")
)

// SpaceRepo handles database operations for spaces
type SpaceRepo struct {
	pool *pgxpool.Pool
}

// NewSpaceRepo creates a new space repository using the global pool.
func NewSpaceRepo() *SpaceRepo {
	return &SpaceRepo{pool: database.GetPool()}
}

// GetByID fetches a space by its primary key.
func (r *SpaceRepo) GetByID(ctx context.Context, id string) (models.Space, error) {
	query := `
		SELECT id, name, slug, icon, workspace_id,
		       created_at::text, updated_at::text
		FROM spaces
		WHERE id = $1`

	var s models.Space
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Slug, &s.Icon, &s.WorkspaceID,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("querying space by id %q: %w", id, err)
	}
	return s, nil
}

// GetBySlug fetches a space by its slug.
func (r *SpaceRepo) GetBySlug(ctx context.Context, slug string) (models.Space, error) {
	query := `
		SELECT id, name, slug, icon, workspace_id,
		       created_at::text, updated_at::text
		FROM spaces
		WHERE slug = $1`

	var s models.Space
	err := r.pool.QueryRow(ctx, query, slug).Scan(
		&s.ID, &s.Name, &s.Slug, &s.Icon, &s.WorkspaceID,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("querying space by slug %q: %w", slug, err)
	}
	return s, nil
}

// GetDefaultSpaceID returns the ID of the "notes" default space.
func (r *SpaceRepo) GetDefaultSpaceID(ctx context.Context) (string, error) {
	query := `SELECT id FROM spaces WHERE slug = 'notes' LIMIT 1`
	var id string
	err := r.pool.QueryRow(ctx, query).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrSpaceNotFound
		}
		return "", fmt.Errorf("getting default space id: %w", err)
	}
	return id, nil
}

// ListAll returns all spaces ordered by name.
func (r *SpaceRepo) ListAll(ctx context.Context, workspaceID string) ([]models.Space, error) {
	query := `
		SELECT id, name, slug, icon, workspace_id,
		       created_at::text, updated_at::text
		FROM spaces
		WHERE workspace_id = $1
		ORDER BY name`

	rows, err := r.pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing spaces: %w", err)
	}
	defer rows.Close()

	var spaces []models.Space
	for rows.Next() {
		var s models.Space
		if err := rows.Scan(&s.ID, &s.Name, &s.Slug, &s.Icon, &s.WorkspaceID, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning space row: %w", err)
		}
		spaces = append(spaces, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating space rows: %w", err)
	}

	if spaces == nil {
		spaces = []models.Space{}
	}
	return spaces, nil
}

// Insert creates a new space row.
func (r *SpaceRepo) Insert(ctx context.Context, s models.Space) error {
	query := `
		INSERT INTO spaces (id, name, slug, icon, workspace_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, now(), now())`

	_, err := r.pool.Exec(ctx, query, s.ID, s.Name, s.Slug, s.Icon, s.WorkspaceID)
	if err != nil {
		return fmt.Errorf("inserting space %q: %w", s.Slug, err)
	}
	return nil
}

// Update modifies an existing space row.
func (r *SpaceRepo) Update(ctx context.Context, s models.Space) error {
	query := `
		UPDATE spaces SET name = $1, slug = $2, icon = $3, updated_at = now()
		WHERE id = $4`

	tag, err := r.pool.Exec(ctx, query, s.Name, s.Slug, s.Icon, s.ID)
	if err != nil {
		return fmt.Errorf("updating space %q: %w", s.ID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: space %q", ErrSpaceNotFound, s.ID)
	}
	return nil
}

// Delete removes a space by ID.
func (r *SpaceRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM spaces WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting space %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: space %q", ErrSpaceNotFound, id)
	}
	return nil
}

// PageCount returns the number of pages in a space.
func (r *SpaceRepo) PageCount(ctx context.Context, spaceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM pages WHERE space_id = $1`, spaceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting pages in space %q: %w", spaceID, err)
	}
	return count, nil
}
