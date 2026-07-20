package repositories

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database"
)

type PageFavoriteRepo struct {
	pool *pgxpool.Pool
}

func NewPageFavoriteRepo() *PageFavoriteRepo {
	return &PageFavoriteRepo{pool: database.GetPool()}
}

func (r *PageFavoriteRepo) IsFavorited(ctx context.Context, userID, pageID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM page_favorites WHERE user_id = $1 AND page_id = $2)`, userID, pageID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking page favorite: %w", err)
	}
	return exists, nil
}

func (r *PageFavoriteRepo) Add(ctx context.Context, userID, pageID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO page_favorites (user_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, pageID)
	if err != nil {
		return fmt.Errorf("adding page favorite: %w", err)
	}
	return nil
}

func (r *PageFavoriteRepo) Remove(ctx context.Context, userID, pageID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM page_favorites WHERE user_id = $1 AND page_id = $2`, userID, pageID)
	if err != nil {
		return fmt.Errorf("removing page favorite: %w", err)
	}
	return nil
}

func (r *PageFavoriteRepo) List(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT page_id FROM page_favorites WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing page favorites: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scanning page favorite: %w", err)
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, nil
}

func (r *PageFavoriteRepo) Toggle(ctx context.Context, userID, pageID string) (bool, error) {
	var favorited bool
	err := r.pool.QueryRow(ctx, `
		WITH toggled AS (
			DELETE FROM page_favorites WHERE user_id = $1 AND page_id = $2 RETURNING 1
		), inserted AS (
			INSERT INTO page_favorites (user_id, page_id)
			SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM toggled)
			RETURNING 1
		)
		SELECT EXISTS(SELECT 1 FROM inserted)
	`, userID, pageID).Scan(&favorited)
	if err != nil {
		return false, fmt.Errorf("toggling page favorite: %w", err)
	}
	return favorited, nil
}
