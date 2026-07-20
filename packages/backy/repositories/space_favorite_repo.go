package repositories

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/database"
)

type SpaceFavoriteRepo struct {
	pool *pgxpool.Pool
}

func NewSpaceFavoriteRepo() *SpaceFavoriteRepo {
	return &SpaceFavoriteRepo{pool: database.GetPool()}
}

func (r *SpaceFavoriteRepo) IsFavorited(ctx context.Context, userID, spaceID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM space_favorites WHERE user_id = $1 AND space_id = $2)`, userID, spaceID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking space favorite: %w", err)
	}
	return exists, nil
}

func (r *SpaceFavoriteRepo) Add(ctx context.Context, userID, spaceID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO space_favorites (user_id, space_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, spaceID)
	if err != nil {
		return fmt.Errorf("adding space favorite: %w", err)
	}
	return nil
}

func (r *SpaceFavoriteRepo) Remove(ctx context.Context, userID, spaceID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM space_favorites WHERE user_id = $1 AND space_id = $2`, userID, spaceID)
	if err != nil {
		return fmt.Errorf("removing space favorite: %w", err)
	}
	return nil
}

func (r *SpaceFavoriteRepo) List(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT space_id FROM space_favorites WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing space favorites: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scanning space favorite: %w", err)
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, nil
}

// Toggle atomically toggles the favorite status for a space.
// Returns true if the space is now favorited, false if unfavorited.
func (r *SpaceFavoriteRepo) Toggle(ctx context.Context, userID, spaceID string) (bool, error) {
	var favorited bool
	err := r.pool.QueryRow(ctx, `
		WITH toggled AS (
			DELETE FROM space_favorites WHERE user_id = $1 AND space_id = $2 RETURNING 1
		), inserted AS (
			INSERT INTO space_favorites (user_id, space_id)
			SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM toggled)
			RETURNING 1
		)
		SELECT EXISTS(SELECT 1 FROM inserted)
	`, userID, spaceID).Scan(&favorited)
	if err != nil {
		return false, fmt.Errorf("toggling space favorite: %w", err)
	}
	return favorited, nil
}
