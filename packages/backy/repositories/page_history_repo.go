package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/models"
)

var ErrPageHistoryNotFound = errors.New("page history not found")

// PageHistoryRepo handles database operations for page history
type PageHistoryRepo struct {
	pool *pgxpool.Pool
}

// NewPageHistoryRepo creates a new page history repository
func NewPageHistoryRepo(pool *pgxpool.Pool) *PageHistoryRepo {
	return &PageHistoryRepo{pool: pool}
}

// Insert creates a new page history row
func (r *PageHistoryRepo) Insert(ctx context.Context, h models.PageHistory) error {
	contentJSONBytes := []byte(h.ContentJSON)
	if len(contentJSONBytes) == 0 {
		contentJSONBytes = []byte("{}")
	}

	query := `
		INSERT INTO page_history (id, page_id, title, content_json, ydoc,
		                          text_content, operation, created_by_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.pool.Exec(ctx, query,
		h.ID, h.PageID, h.Title, contentJSONBytes, h.YDoc,
		h.TextContent, h.Operation, h.CreatedByID, h.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("inserting page history for page %q: %w", h.PageID, err)
	}

	return nil
}

// GetByID fetches a single history entry by its primary key.
func (r *PageHistoryRepo) GetByID(ctx context.Context, id string) (models.PageHistory, error) {
	query := `
		SELECT id, page_id, title, content_json, ydoc, text_content,
		       operation, created_by_id, created_at
		FROM page_history
		WHERE id = $1`

	var h models.PageHistory
	var contentJSONBytes []byte

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&h.ID, &h.PageID, &h.Title, &contentJSONBytes, &h.YDoc,
		&h.TextContent, &h.Operation, &h.CreatedByID, &h.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PageHistory{}, ErrPageHistoryNotFound
		}
		return models.PageHistory{}, fmt.Errorf("getting history by id %q: %w", id, err)
	}

	h.ContentJSON = json.RawMessage(contentJSONBytes)

	return h, nil
}

// ListByPageID returns all history entries for a page, ordered by created_at desc
func (r *PageHistoryRepo) ListByPageID(ctx context.Context, pageID string) ([]models.PageHistory, error) {
	query := `
		SELECT id, page_id, title, content_json, ydoc, text_content,
		       operation, created_by_id, created_at
		FROM page_history
		WHERE page_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, pageID)
	if err != nil {
		return nil, fmt.Errorf("listing page history for page %q: %w", pageID, err)
	}
	defer rows.Close()

	var histories []models.PageHistory
	for rows.Next() {
		var h models.PageHistory
		var contentJSONBytes []byte

		if err := rows.Scan(
			&h.ID, &h.PageID, &h.Title, &contentJSONBytes, &h.YDoc,
			&h.TextContent, &h.Operation, &h.CreatedByID, &h.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning page history row: %w", err)
		}

		h.ContentJSON = json.RawMessage(contentJSONBytes)

		histories = append(histories, h)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating page history rows: %w", err)
	}

	return histories, nil
}
