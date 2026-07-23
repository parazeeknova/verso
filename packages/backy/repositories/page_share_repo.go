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
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, COALESCE(access_level, 'read'), COALESCE(comment_access, 'all'), created_at, updated_at
		FROM page_shares
		WHERE page_id = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, pageID).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.AccessLevel, &s.CommentAccess, &s.CreatedAt, &s.UpdatedAt,
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
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, COALESCE(access_level, 'read'), COALESCE(comment_access, 'all'), created_at, updated_at
		FROM page_shares
		WHERE share_token = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, token).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.AccessLevel, &s.CommentAccess, &s.CreatedAt, &s.UpdatedAt,
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
		SELECT id, page_id, share_token, short_code, search_indexing, is_enabled, COALESCE(access_level, 'read'), COALESCE(comment_access, 'all'), created_at, updated_at
		FROM page_shares
		WHERE short_code = $1`

	var s models.PageShare
	err := r.pool.QueryRow(ctx, query, shortCode).Scan(
		&s.ID, &s.PageID, &s.ShareToken, &s.ShortCode, &s.SearchIndexing, &s.IsEnabled, &s.AccessLevel, &s.CommentAccess, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.PageShare{}, ErrShareNotFound
		}
		return models.PageShare{}, fmt.Errorf("getting page share by short code %q: %w", shortCode, err)
	}
	return s, nil
}

func (r *PageShareRepo) Upsert(ctx context.Context, s models.PageShare) (models.PageShare, error) {
	if s.AccessLevel == "" {
		s.AccessLevel = "read"
	}
	if s.CommentAccess == "" {
		s.CommentAccess = "all"
	}
	query := `
		INSERT INTO page_shares (id, page_id, share_token, short_code, search_indexing, is_enabled, access_level, comment_access, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (page_id) DO UPDATE
		SET share_token = COALESCE(NULLIF(page_shares.share_token, ''), EXCLUDED.share_token),
		    short_code = COALESCE(EXCLUDED.short_code, page_shares.short_code),
		    search_indexing = EXCLUDED.search_indexing,
		    is_enabled = EXCLUDED.is_enabled,
		    access_level = EXCLUDED.access_level,
		    comment_access = EXCLUDED.comment_access,
		    updated_at = EXCLUDED.updated_at
		RETURNING id, page_id, share_token, short_code, search_indexing, is_enabled, COALESCE(access_level, 'read'), COALESCE(comment_access, 'all'), created_at, updated_at`

	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	var res models.PageShare
	err := r.pool.QueryRow(
		ctx, query,
		s.ID, s.PageID, s.ShareToken, s.ShortCode, s.SearchIndexing, s.IsEnabled, s.AccessLevel, s.CommentAccess, s.CreatedAt, s.UpdatedAt,
	).Scan(
		&res.ID, &res.PageID, &res.ShareToken, &res.ShortCode, &res.SearchIndexing, &res.IsEnabled, &res.AccessLevel, &res.CommentAccess, &res.CreatedAt, &res.UpdatedAt,
	)
	if err != nil {
		return models.PageShare{}, fmt.Errorf("upserting page share: %w", err)
	}
	return res, nil
}

func (r *PageShareRepo) GetSharedMapByPageIDs(ctx context.Context, pageIDs []string) (map[string]bool, error) {
	if len(pageIDs) == 0 {
		return map[string]bool{}, nil
	}
	query := `SELECT page_id FROM page_shares WHERE is_enabled = true AND page_id = ANY($1)`
	rows, err := r.pool.Query(ctx, query, pageIDs)
	if err != nil {
		return nil, fmt.Errorf("getting shared page ids map: %w", err)
	}
	defer rows.Close()

	res := make(map[string]bool, len(pageIDs))
	for rows.Next() {
		var pid string
		if err := rows.Scan(&pid); err == nil {
			res[pid] = true
		}
	}
	return res, nil
}
