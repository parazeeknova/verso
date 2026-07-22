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
	cleaned := strings.TrimPrefix(room, "page.")
	cleaned = strings.TrimPrefix(cleaned, "/")
	if _, err := uuid.Parse(cleaned); err != nil {
		return ""
	}
	return cleaned
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

	// Load existing ydoc
	var existing []byte
	querySelect := `SELECT ydoc FROM pages WHERE id = $1 AND deleted_at IS NULL`
	err := p.pool.QueryRow(ctx, querySelect, pageID).Scan(&existing)
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
			// If merging fails, fallback to update
			merged = update
		}
	}

	queryUpdate := `UPDATE pages SET ydoc = $1, updated_at = now() WHERE id = $2 AND deleted_at IS NULL`
	_, err = p.pool.Exec(ctx, queryUpdate, merged, pageID)
	if err != nil {
		return fmt.Errorf("storing ydoc for room %s: %w", room, err)
	}

	return nil
}
