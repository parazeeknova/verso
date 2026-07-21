package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database/models"
)

var ErrPageNotFound = errors.New("page not found")

// PageRepo handles database operations for pages
type PageRepo struct {
	pool *pgxpool.Pool
}

// NewPageRepo creates a new page repository
func NewPageRepo(pool *pgxpool.Pool) *PageRepo {
	return &PageRepo{pool: pool}
}

// GetBySlug fetches a published page by its slug_id
func (r *PageRepo) GetBySlug(ctx context.Context, slug string) (models.Page, error) {
	query := `
		SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		       text_content, position, is_published, parent_page_id, space_id, workspace_id, creator_id,
		       last_updated_by_id, created_at, updated_at
		FROM pages
		WHERE slug_id = $1 AND is_published = true AND deleted_at IS NULL`

	var p models.Page
	var contentJSONBytes []byte

	err := r.pool.QueryRow(ctx, query, slug).Scan(
		&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
		&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished,
		&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("querying page by slug %q: %w", slug, err)
	}

	p.ContentJSON = json.RawMessage(contentJSONBytes)

	return p, nil
}

// ListPublished returns all published pages, ordered by created_at desc
func (r *PageRepo) ListPublished(ctx context.Context) ([]models.Page, error) {
	query := `
		SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		       text_content, position, is_published, is_locked, parent_page_id, space_id, workspace_id, creator_id,
		       last_updated_by_id, created_at, updated_at
		FROM pages
		WHERE is_published = true AND deleted_at IS NULL
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("listing published pages: %w", err)
	}
	defer rows.Close()

	var pages []models.Page
	for rows.Next() {
		var p models.Page
		var contentJSONBytes []byte

		if err := rows.Scan(
			&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
			&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished, &p.IsLocked,
			&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning page row: %w", err)
		}

		p.ContentJSON = json.RawMessage(contentJSONBytes)

		pages = append(pages, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page rows: %w", err)
	}

	return pages, nil
}

// ListAll returns all non-deleted pages (both published and drafts), ordered by created_at desc.
func (r *PageRepo) ListAll(ctx context.Context) ([]models.Page, error) {
	query := `
		SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		       text_content, position, is_published, is_locked, parent_page_id, space_id, workspace_id, creator_id,
		       last_updated_by_id, created_at, updated_at
		FROM pages
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("listing all pages: %w", err)
	}
	defer rows.Close()

	var pages []models.Page
	for rows.Next() {
		var p models.Page
		var contentJSONBytes []byte

		if err := rows.Scan(
			&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
			&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished, &p.IsLocked,
			&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning page row: %w", err)
		}

		p.ContentJSON = json.RawMessage(contentJSONBytes)

		pages = append(pages, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page rows: %w", err)
	}

	return pages, nil
}

// ListAllForUser returns all non-deleted pages in spaces the user is a member of.
func (r *PageRepo) ListAllForUser(ctx context.Context, userID string) ([]models.Page, error) {
	query := `
		SELECT DISTINCT ON (p.id)
			p.id, p.slug_id, p.title, p.icon, p.cover_photo, p.content_json, p.ydoc,
			p.text_content, p.position, p.is_published, p.is_locked, p.parent_page_id, p.space_id, p.workspace_id, p.creator_id,
			p.last_updated_by_id, p.created_at, p.updated_at
		FROM pages p
		JOIN space_members sm ON sm.space_id = p.space_id
		LEFT JOIN group_users gu ON gu.group_id = sm.group_id
		WHERE p.deleted_at IS NULL AND (sm.user_id = $1 OR gu.user_id = $1)
		ORDER BY p.id, p.created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("listing pages for user: %w", err)
	}
	defer rows.Close()

	var pages []models.Page
	for rows.Next() {
		var p models.Page
		var contentJSONBytes []byte

		if err := rows.Scan(
			&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
			&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished, &p.IsLocked,
			&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning page row: %w", err)
		}

		p.ContentJSON = json.RawMessage(contentJSONBytes)
		pages = append(pages, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page rows: %w", err)
	}

	return pages, nil
}

// GetByID fetches a page by its primary key ID (not slug).
func (r *PageRepo) GetByID(ctx context.Context, id string) (models.Page, error) {
	query := `
		SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		       text_content, position, is_published, is_locked, parent_page_id, space_id, workspace_id, creator_id,
		       last_updated_by_id, created_at, updated_at
		FROM pages
		WHERE id = $1 AND deleted_at IS NULL`

	var p models.Page
	var contentJSONBytes []byte

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
		&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished, &p.IsLocked,
		&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("querying page by id %q: %w", id, err)
	}

	p.ContentJSON = json.RawMessage(contentJSONBytes)

	return p, nil
}

// GetBySpaceAndSlug fetches a page by its space_id and slug_id.
func (r *PageRepo) GetBySpaceAndSlug(ctx context.Context, spaceID, slugID string) (models.Page, error) {
	query := `
		SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		       text_content, position, is_published, is_locked, parent_page_id, space_id, workspace_id, creator_id,
		       last_updated_by_id, created_at, updated_at
		FROM pages
		WHERE space_id = $1 AND slug_id = $2 AND deleted_at IS NULL`

	var p models.Page
	var contentJSONBytes []byte

	err := r.pool.QueryRow(ctx, query, spaceID, slugID).Scan(
		&p.ID, &p.SlugID, &p.Title, &p.Icon, &p.CoverPhoto,
		&contentJSONBytes, &p.YDoc, &p.TextContent, &p.Position, &p.IsPublished, &p.IsLocked,
		&p.ParentPageID, &p.SpaceID, &p.WorkspaceID, &p.CreatorID, &p.LastUpdatedByID,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("querying page by space %q slug %q: %w", spaceID, slugID, err)
	}

	p.ContentJSON = json.RawMessage(contentJSONBytes)

	return p, nil
}

// Insert creates a new page row
func (r *PageRepo) Insert(ctx context.Context, p models.Page) error {
	contentJSONBytes := []byte(p.ContentJSON)
	if len(contentJSONBytes) == 0 {
		contentJSONBytes = []byte("{}")
	}

	query := `
		INSERT INTO pages (id, slug_id, title, icon, cover_photo, content_json, ydoc,
		                   text_content, position, is_published, parent_page_id, space_id, creator_id,
		                   last_updated_by_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := r.pool.Exec(
		ctx, query,
		p.ID, p.SlugID, p.Title, p.Icon, p.CoverPhoto,
		contentJSONBytes, p.YDoc, p.TextContent, p.Position, p.IsPublished,
		p.ParentPageID, p.SpaceID, p.CreatorID, p.LastUpdatedByID,
		p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("inserting page %q: %w", p.SlugID, err)
	}

	return nil
}

// Update modifies an existing page row
func (r *PageRepo) Update(ctx context.Context, p models.Page) error {
	contentJSONBytes := []byte(p.ContentJSON)
	if len(contentJSONBytes) == 0 {
		contentJSONBytes = []byte("{}")
	}

	query := `
		UPDATE pages
		SET title = $1, icon = $2, cover_photo = $3, content_json = $4, ydoc = $5,
		    text_content = $6, position = $7, is_published = $8, is_locked = $9, parent_page_id = $10,
		    last_updated_by_id = $11, updated_at = $12
		WHERE id = $13`

	tag, err := r.pool.Exec(
		ctx, query,
		p.Title, p.Icon, p.CoverPhoto, contentJSONBytes, p.YDoc,
		p.TextContent, p.Position, p.IsPublished, p.IsLocked, p.ParentPageID,
		p.LastUpdatedByID, p.UpdatedAt, p.ID,
	)
	if err != nil {
		return fmt.Errorf("updating page %q: %w", p.SlugID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: page %q", ErrPageNotFound, p.SlugID)
	}

	return nil
}

// SoftDelete marks a page as deleted.
func (r *PageRepo) SoftDelete(ctx context.Context, id, deletedByID string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE pages SET deleted_at = now(), deleted_by_id = $1 WHERE id = $2 AND deleted_at IS NULL`, deletedByID, id)
	if err != nil {
		return fmt.Errorf("soft-deleting page %q: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%w: page %q", ErrPageNotFound, id)
	}
	return nil
}

// ListRoots returns all root pages (parent_page_id IS NULL) in a space, ordered by position.
func (r *PageRepo) ListRoots(ctx context.Context, spaceID string) ([]models.PageTreeItem, error) {
	query := `
		SELECT p.id, p.slug_id, p.title, p.icon, p.position, p.is_published,
		       COALESCE(ps.is_enabled, false) AS is_shared,
		       p.parent_page_id, p.space_id, p.workspace_id, p.creator_id, p.created_at, p.updated_at,
		       EXISTS(SELECT 1 FROM pages c WHERE c.parent_page_id = p.id AND c.deleted_at IS NULL) AS has_children
		FROM pages p
		LEFT JOIN page_shares ps ON ps.page_id = p.id
		WHERE p.parent_page_id IS NULL AND p.space_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.position COLLATE "C"`

	rows, err := r.pool.Query(ctx, query, spaceID)
	if err != nil {
		return nil, fmt.Errorf("listing root pages: %w", err)
	}
	defer rows.Close()

	return scanPageTreeItems(rows)
}

// ListChildren returns child pages of a given parent, ordered by position.
func (r *PageRepo) ListChildren(ctx context.Context, parentID string) ([]models.PageTreeItem, error) {
	query := `
		SELECT p.id, p.slug_id, p.title, p.icon, p.position, p.is_published,
		       COALESCE(ps.is_enabled, false) AS is_shared,
		       p.parent_page_id, p.space_id, p.workspace_id, p.creator_id, p.created_at, p.updated_at,
		       EXISTS(SELECT 1 FROM pages c WHERE c.parent_page_id = p.id AND c.deleted_at IS NULL) AS has_children
		FROM pages p
		LEFT JOIN page_shares ps ON ps.page_id = p.id
		WHERE p.parent_page_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.position COLLATE "C"`

	rows, err := r.pool.Query(ctx, query, parentID)
	if err != nil {
		return nil, fmt.Errorf("listing children of page %q: %w", parentID, err)
	}
	defer rows.Close()

	return scanPageTreeItems(rows)
}

// ListTree returns all pages in a space formatted as a flat tree.
func (r *PageRepo) ListTree(ctx context.Context, spaceID string) ([]models.PageTreeItem, error) {
	query := `
		SELECT p.id, p.slug_id, p.title, p.icon, p.position, p.is_published,
		       COALESCE(ps.is_enabled, false) AS is_shared,
		       p.parent_page_id, p.space_id, p.workspace_id, p.creator_id, p.created_at, p.updated_at,
		       EXISTS(SELECT 1 FROM pages c WHERE c.parent_page_id = p.id AND c.deleted_at IS NULL) AS has_children
		FROM pages p
		LEFT JOIN page_shares ps ON ps.page_id = p.id
		WHERE p.space_id = $1 AND p.deleted_at IS NULL
		ORDER BY
			CASE WHEN p.parent_page_id IS NULL THEN p.position ELSE (SELECT pp.position FROM pages pp WHERE pp.id = p.parent_page_id AND pp.deleted_at IS NULL) END COLLATE "C",
			p.position COLLATE "C"`

	rows, err := r.pool.Query(ctx, query, spaceID)
	if err != nil {
		return nil, fmt.Errorf("listing page tree: %w", err)
	}
	defer rows.Close()

	return scanPageTreeItems(rows)
}

// LastPosition returns the position of the last child under a parent in a space.
func (r *PageRepo) LastPosition(ctx context.Context, spaceID string, parentID *string) (*string, error) {
	var query string
	var args []any

	if parentID != nil {
		query = `
			SELECT position FROM pages
			WHERE space_id = $1 AND parent_page_id = $2 AND deleted_at IS NULL
			ORDER BY position COLLATE "C" DESC
			LIMIT 1`
		args = append(args, spaceID, *parentID)
	} else {
		query = `
			SELECT position FROM pages
			WHERE space_id = $1 AND parent_page_id IS NULL AND deleted_at IS NULL
			ORDER BY position COLLATE "C" DESC
			LIMIT 1`
		args = append(args, spaceID)
	}

	var position *string
	err := r.pool.QueryRow(ctx, query, args...).Scan(&position)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting last position: %w", err)
	}

	return position, nil
}

// CountPagesInSpace returns the number of non-deleted pages in a space.
func (r *PageRepo) CountPagesInSpace(ctx context.Context, spaceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM pages WHERE space_id = $1 AND deleted_at IS NULL`, spaceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting pages in space %q: %w", spaceID, err)
	}
	return count, nil
}

func scanPageTreeItems(rows pgx.Rows) ([]models.PageTreeItem, error) {
	var items []models.PageTreeItem
	for rows.Next() {
		var item models.PageTreeItem
		var createdAt, updatedAt any
		if err := rows.Scan(
			&item.ID, &item.SlugID, &item.Title, &item.Icon, &item.Position,
			&item.IsPublished, &item.IsShared, &item.ParentPageID, &item.SpaceID, &item.WorkspaceID, &item.CreatorID,
			&createdAt, &updatedAt, &item.HasChildren,
		); err != nil {
			return nil, fmt.Errorf("scanning page tree row: %w", err)
		}

		if t, ok := createdAt.(interface{ Format(string) string }); ok {
			item.CreatedAt = t.Format("2006-01-02T15:04:05Z07:00")
		}
		if t, ok := updatedAt.(interface{ Format(string) string }); ok {
			item.UpdatedAt = t.Format("2006-01-02T15:04:05Z07:00")
		}

		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page tree rows: %w", err)
	}
	return items, nil
}

// ListIDsInSpace returns all non-deleted page IDs in a space.
func (r *PageRepo) ListIDsInSpace(ctx context.Context, spaceID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT id FROM pages WHERE space_id = $1 AND deleted_at IS NULL`, spaceID)
	if err != nil {
		return nil, fmt.Errorf("querying page ids: %w", err)
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scanning page id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page ids: %w", err)
	}
	return ids, nil
}

// SoftDeleteAllInSpace soft-deletes all pages belonging to a space.
func (r *PageRepo) SoftDeleteAllInSpace(ctx context.Context, spaceID, deletedByID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE pages SET deleted_at = now(), deleted_by_id = $1 WHERE space_id = $2 AND deleted_at IS NULL`, deletedByID, spaceID)
	if err != nil {
		return fmt.Errorf("soft-deleting all pages in space: %w", err)
	}
	return nil
}
