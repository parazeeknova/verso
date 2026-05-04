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
	ErrWorkspaceNotFound = errors.New("workspace not found")
	ErrWorkspaceNotEmpty = errors.New("workspace is not empty")
)

// WorkspaceRepo handles database operations for workspaces
type WorkspaceRepo struct {
	pool *pgxpool.Pool
}

// NewWorkspaceRepo creates a new workspace repository using the global pool.
func NewWorkspaceRepo() *WorkspaceRepo {
	return &WorkspaceRepo{pool: database.GetPool()}
}

// GetByID fetches a workspace by its primary key.
func (r *WorkspaceRepo) GetByID(ctx context.Context, id string) (models.Workspace, error) {
	query := `
		SELECT id, name, slug, icon,
		       created_at::text, updated_at::text
		FROM workspaces
		WHERE id = $1`

	var w models.Workspace
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&w.ID, &w.Name, &w.Slug, &w.Icon,
		&w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Workspace{}, ErrWorkspaceNotFound
		}
		return models.Workspace{}, fmt.Errorf("querying workspace by id %q: %w", id, err)
	}
	return w, nil
}

// GetDefaultWorkspaceID returns the ID of the default "personal" workspace.
func (r *WorkspaceRepo) GetDefaultWorkspaceID(ctx context.Context) (string, error) {
	query := `SELECT id FROM workspaces WHERE slug = 'personal' LIMIT 1`
	var id string
	err := r.pool.QueryRow(ctx, query).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrWorkspaceNotFound
		}
		return "", fmt.Errorf("getting default workspace id: %w", err)
	}
	return id, nil
}

// ListAll returns all workspaces ordered by name.
func (r *WorkspaceRepo) ListAll(ctx context.Context) ([]models.Workspace, error) {
	query := `
		SELECT id, name, slug, icon,
		       created_at::text, updated_at::text
		FROM workspaces
		ORDER BY name`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("listing workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []models.Workspace
	for rows.Next() {
		var w models.Workspace
		if err := rows.Scan(&w.ID, &w.Name, &w.Slug, &w.Icon, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning workspace row: %w", err)
		}
		workspaces = append(workspaces, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating workspace rows: %w", err)
	}

	if workspaces == nil {
		workspaces = []models.Workspace{}
	}
	return workspaces, nil
}

// Insert creates a new workspace row.
func (r *WorkspaceRepo) Insert(ctx context.Context, w models.Workspace) error {
	query := `
		INSERT INTO workspaces (id, name, slug, icon, created_at, updated_at)
		VALUES ($1, $2, $3, $4, now(), now())`

	_, err := r.pool.Exec(ctx, query, w.ID, w.Name, w.Slug, w.Icon)
	if err != nil {
		return fmt.Errorf("inserting workspace %q: %w", w.Slug, err)
	}
	return nil
}

// Update modifies an existing workspace row.
func (r *WorkspaceRepo) Update(ctx context.Context, w models.Workspace) error {
	query := `
		UPDATE workspaces SET name = $1, slug = $2, icon = $3, updated_at = now()
		WHERE id = $4`

	tag, err := r.pool.Exec(ctx, query, w.Name, w.Slug, w.Icon, w.ID)
	if err != nil {
		return fmt.Errorf("updating workspace %q: %w", w.ID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: workspace %q", ErrWorkspaceNotFound, w.ID)
	}
	return nil
}

// Delete removes a workspace by ID.
func (r *WorkspaceRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM workspaces WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting workspace %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: workspace %q", ErrWorkspaceNotFound, id)
	}
	return nil
}

// SpaceCount returns the number of spaces in a workspace.
func (r *WorkspaceRepo) SpaceCount(ctx context.Context, workspaceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM spaces WHERE workspace_id = $1`, workspaceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting spaces in workspace %q: %w", workspaceID, err)
	}
	return count, nil
}
