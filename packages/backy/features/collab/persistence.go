package collab

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/reearth/ygo/crdt"
)

// PagePersistence implements yws.PersistenceAdapter for Verso pages.
type PagePersistence struct {
	pool *pgxpool.Pool
}

// NewPagePersistence creates a new PostgreSQL-backed persistence adapter.
func NewPagePersistence(pool *pgxpool.Pool) *PagePersistence {
	return &PagePersistence{pool: pool}
}

// extractPageID strips optional "page." prefix from room name and validates UUID syntax.
func extractPageID(room string) string {
	parts := strings.FieldsFunc(room, func(r rune) bool {
		return r == '/' || r == '?' || r == '&' || r == '='
	})
	for _, part := range parts {
		cleaned := strings.TrimPrefix(part, "page.")
		if _, err := uuid.Parse(cleaned); err == nil {
			return cleaned
		}
	}
	return ""
}

// LoadDoc loads the stored ydoc binary update for the given room (page ID).
func (p *PagePersistence) LoadDoc(room string) ([]byte, error) {
	if p == nil || p.pool == nil {
		return nil, nil
	}

	pageID := extractPageID(room)
	if pageID == "" {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `SELECT ydoc FROM pages WHERE id = $1 AND deleted_at IS NULL`
	var ydoc []byte
	err := p.pool.QueryRow(ctx, query, pageID).Scan(&ydoc)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("loading ydoc for room %s: %w", room, err)
	}

	return ydoc, nil
}

// StoreUpdate merges the incremental update into the page's stored ydoc bytea.
func (p *PagePersistence) StoreUpdate(room string, update []byte) error {
	if p == nil || p.pool == nil || len(update) == 0 {
		return nil
	}

	pageID := extractPageID(room)
	if pageID == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning tx for room %s: %w", room, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Load existing ydoc with row lock
	var existing []byte
	querySelect := `SELECT ydoc FROM pages WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`
	err = tx.QueryRow(ctx, querySelect, pageID).Scan(&existing)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("reading ydoc for room %s: %w", room, err)
	}

	var merged []byte
	if len(existing) == 0 {
		merged = update
	} else {
		merged, err = crdt.MergeUpdatesV1(existing, update)
		if err != nil {
			return fmt.Errorf("merging ydoc updates for room %s: %w", room, err)
		}
	}

	queryUpdate := `UPDATE pages SET ydoc = $1, updated_at = now() WHERE id = $2 AND deleted_at IS NULL`
	_, err = tx.Exec(ctx, queryUpdate, merged, pageID)
	if err != nil {
		return fmt.Errorf("storing ydoc for room %s: %w", room, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing ydoc update for room %s: %w", room, err)
	}

	return nil
}
