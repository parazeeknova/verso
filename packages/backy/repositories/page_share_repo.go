package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database"
	"verso/backy/database/models"
)

var ErrShareNotFound = errors.New("share not found")

type PageShareRepo struct {
	pool *pgxpool.Pool
}

func NewPageShareRepo() *PageShareRepo {
	return &PageShareRepo{pool: database.GetPool()}
}

func (r *PageShareRepo) GetByPageID(ctx context.Context, pageID string) (models.PageShare, error) {
	query := `
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, created_at, updated_at
		FROM page_shares
		WHERE page_id = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, pageID).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PageShare{}, ErrShareNotFound
		}
		return models.PageShare{}, fmt.Errorf("getting page share by page id %q: %w", pageID, err)
	}
	return s, nil
}

func (r *PageShareRepo) GetByShareToken(ctx context.Context, token string) (models.PageShare, error) {
	query := `
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, created_at, updated_at
		FROM page_shares
		WHERE share_token = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, token).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PageShare{}, ErrShareNotFound
		}
		return models.PageShare{}, fmt.Errorf("getting page share by share token %q: %w", token, err)
	}
	return s, nil
}

func (r *PageShareRepo) GetByShortCode(ctx context.Context, shortCode string) (models.PageShare, error) {
	query := `
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, created_at, updated_at
		FROM page_shares
		WHERE short_code = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, shortCode).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PageShare{}, ErrShareNotFound
		}
		return models.PageShare{}, fmt.Errorf("getting page share by short code %q: %w", shortCode, err)
	}
	return s, nil
}

func (r *PageShareRepo) Upsert(ctx context.Context, s models.PageShare) error {
	query := `
		INSERT INTO page_shares (id, page_id, share_token, short_code, search_indexing, is_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (page_id) DO UPDATE
		SET share_token = EXCLUDED.share_token,
		    short_code = EXCLUDED.short_code,
		    search_indexing = EXCLUDED.search_indexing,
		    is_enabled = EXCLUDED.is_enabled,
		    updated_at = EXCLUDED.updated_at`

	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	_, err := r.pool.Exec(
		ctx, query,
		s.ID, s.PageID, s.ShareToken, s.ShortCode, s.SearchIndexing, s.IsEnabled, s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("upserting page share: %w", err)
	}
	return nil
}
