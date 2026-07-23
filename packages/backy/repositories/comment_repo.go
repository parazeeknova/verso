package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database"
	"verso/backy/database/models"
)

// CommentRepo handles database operations for comments.
type CommentRepo struct {
	pool *pgxpool.Pool
}

// NewCommentRepo creates a new comment repository.
func NewCommentRepo() *CommentRepo {
	return &CommentRepo{pool: database.GetPool()}
}

// Insert creates a new comment row and returns it with user details.
func (r *CommentRepo) Insert(ctx context.Context, c models.Comment) (*models.CommentWithDetails, error) {
	var creatorIDVal *string
	if c.CreatorID != "" && c.CreatorID != "guest" {
		creatorIDVal = &c.CreatorID
	}

	query := `
		INSERT INTO comments (id, workspace_id, space_id, page_id, creator_id, parent_comment_id, content, selection, type, guest_name, guest_avatar, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := r.pool.Exec(
		ctx, query,
		c.ID, c.WorkspaceID, c.SpaceID, c.PageID, creatorIDVal, c.ParentCommentID,
		c.Content, c.Selection, c.Type, c.GuestName, c.GuestAvatar, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting comment: %w", err)
	}

	return r.GetByID(ctx, c.ID)
}

// GetByID returns a single comment by ID enriched with creator and resolved_by info.
func (r *CommentRepo) GetByID(ctx context.Context, id string) (*models.CommentWithDetails, error) {
	query := `
		SELECT c.id, c.workspace_id, c.space_id, c.page_id, COALESCE(c.creator_id::text, 'guest'), c.parent_comment_id,
		       c.content, c.selection, c.type, c.resolved_at, c.resolved_by_id, c.edited_at,
		       c.created_at, c.updated_at, c.deleted_at,
		       COALESCE(u.name, c.guest_name, 'Guest'), COALESCE(u.avatar_url, c.guest_avatar, ''),
		       COALESCE(ru.name, ''), COALESCE(ru.avatar_url, '')
		FROM comments c
		LEFT JOIN users u ON u.id = c.creator_id
		LEFT JOIN users ru ON ru.id = c.resolved_by_id
		WHERE c.id = $1 AND c.deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, query, id)
	var cmd models.CommentWithDetails
	var parentID, selection, resolvedByID *string
	var ruName, ruAvatar string

	err := row.Scan(
		&cmd.ID, &cmd.WorkspaceID, &cmd.SpaceID, &cmd.PageID, &cmd.CreatorID, &parentID,
		&cmd.Content, &selection, &cmd.Type, &cmd.ResolvedAt, &resolvedByID, &cmd.EditedAt,
		&cmd.CreatedAt, &cmd.UpdatedAt, &cmd.DeletedAt,
		&cmd.Creator.Name, &cmd.Creator.AvatarURL,
		&ruName, &ruAvatar,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("getting comment by id: %w", err)
	}

	cmd.ParentCommentID = parentID
	cmd.Selection = selection
	cmd.ResolvedByID = resolvedByID
	cmd.Creator.ID = cmd.CreatorID
	if cmd.Creator.Name == "" {
		cmd.Creator.Name = "Guest"
	}

	if resolvedByID != nil {
		cmd.ResolvedBy = &models.CommentUserMeta{
			ID:        *resolvedByID,
			Name:      ruName,
			AvatarURL: ruAvatar,
		}
	}

	return &cmd, nil
}

// ListByPageID returns all non-deleted comments for a page ordered chronologically.
func (r *CommentRepo) ListByPageID(ctx context.Context, pageID string) ([]models.CommentWithDetails, error) {
	query := `
		SELECT c.id, c.workspace_id, c.space_id, c.page_id, COALESCE(c.creator_id::text, 'guest'), c.parent_comment_id,
		       c.content, c.selection, c.type, c.resolved_at, c.resolved_by_id, c.edited_at,
		       c.created_at, c.updated_at, c.deleted_at,
		       COALESCE(u.name, c.guest_name, 'Guest'), COALESCE(u.avatar_url, c.guest_avatar, ''),
		       COALESCE(ru.name, ''), COALESCE(ru.avatar_url, '')
		FROM comments c
		LEFT JOIN users u ON u.id = c.creator_id
		LEFT JOIN users ru ON ru.id = c.resolved_by_id
		WHERE c.page_id = $1 AND c.deleted_at IS NULL
		ORDER BY c.created_at ASC`

	rows, err := r.pool.Query(ctx, query, pageID)
	if err != nil {
		return nil, fmt.Errorf("listing page comments: %w", err)
	}
	defer rows.Close()

	var comments []models.CommentWithDetails
	for rows.Next() {
		var cmd models.CommentWithDetails
		var parentID, selection, resolvedByID *string
		var ruName, ruAvatar string

		err := rows.Scan(
			&cmd.ID, &cmd.WorkspaceID, &cmd.SpaceID, &cmd.PageID, &cmd.CreatorID, &parentID,
			&cmd.Content, &selection, &cmd.Type, &cmd.ResolvedAt, &resolvedByID, &cmd.EditedAt,
			&cmd.CreatedAt, &cmd.UpdatedAt, &cmd.DeletedAt,
			&cmd.Creator.Name, &cmd.Creator.AvatarURL,
			&ruName, &ruAvatar,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning comment: %w", err)
		}

		cmd.ParentCommentID = parentID
		cmd.Selection = selection
		cmd.ResolvedByID = resolvedByID
		cmd.Creator.ID = cmd.CreatorID
		if cmd.Creator.Name == "" {
			cmd.Creator.Name = "Guest"
		}

		if resolvedByID != nil {
			cmd.ResolvedBy = &models.CommentUserMeta{
				ID:        *resolvedByID,
				Name:      ruName,
				AvatarURL: ruAvatar,
			}
		}

		comments = append(comments, cmd)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating comments: %w", err)
	}

	if comments == nil {
		comments = []models.CommentWithDetails{}
	}

	return comments, nil
}

// Update modifies content and edited_at for a comment.
func (r *CommentRepo) Update(ctx context.Context, id string, content string, editedAt time.Time) (*models.CommentWithDetails, error) {
	query := `
		UPDATE comments
		SET content = $1, edited_at = $2, updated_at = $3
		WHERE id = $4 AND deleted_at IS NULL`

	now := time.Now().UTC()
	tag, err := r.pool.Exec(ctx, query, content, editedAt, now, id)
	if err != nil {
		return nil, fmt.Errorf("updating comment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, pgx.ErrNoRows
	}

	return r.GetByID(ctx, id)
}

// ToggleResolve sets or clears resolved_at and resolved_by_id on a top-level comment.
func (r *CommentRepo) ToggleResolve(ctx context.Context, id string, resolved bool, resolvedByID string) (*models.CommentWithDetails, error) {
	var query string
	now := time.Now().UTC()

	if resolved {
		query = `
			UPDATE comments
			SET resolved_at = $1, resolved_by_id = $2, updated_at = $3
			WHERE id = $4 AND deleted_at IS NULL`
		_, err := r.pool.Exec(ctx, query, now, resolvedByID, now, id)
		if err != nil {
			return nil, fmt.Errorf("resolving comment: %w", err)
		}
	} else {
		query = `
			UPDATE comments
			SET resolved_at = NULL, resolved_by_id = NULL, updated_at = $1
			WHERE id = $2 AND deleted_at IS NULL`
		_, err := r.pool.Exec(ctx, query, now, id)
		if err != nil {
			return nil, fmt.Errorf("unresolving comment: %w", err)
		}
	}

	return r.GetByID(ctx, id)
}

// Delete soft-deletes a comment.
func (r *CommentRepo) Delete(ctx context.Context, id string) error {
	now := time.Now().UTC()
	query := `UPDATE comments SET deleted_at = $1 WHERE id = $2 OR parent_comment_id = $2`
	_, err := r.pool.Exec(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("deleting comment: %w", err)
	}
	return nil
}

// DeleteBySpaceID soft-deletes all comments for a space.
func (r *CommentRepo) DeleteBySpaceID(ctx context.Context, spaceID string) error {
	now := time.Now().UTC()
	query := `UPDATE comments SET deleted_at = $1 WHERE space_id = $2 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, query, now, spaceID)
	if err != nil {
		return fmt.Errorf("deleting comments for space %q: %w", spaceID, err)
	}
	return nil
}

// HasChildren returns true if a comment has reply comments.
func (r *CommentRepo) HasChildren(ctx context.Context, id string) (bool, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM comments WHERE parent_comment_id = $1 AND deleted_at IS NULL`, id).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("checking comment replies: %w", err)
	}
	return count > 0, nil
}
