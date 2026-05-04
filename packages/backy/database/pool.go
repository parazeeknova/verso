package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"verso/backy/logger"
)

var globalPool *pgxpool.Pool

// GetPool returns the initialized global connection pool.
// Panics if the pool has not been initialized.
func GetPool() *pgxpool.Pool {
	if globalPool == nil {
		panic("database: pool not initialized - call InitPool first")
	}
	return globalPool
}

// InitPool creates, validates, and stores a global pgxpool connection pool.
func InitPool(ctx context.Context, cfg Config) error {
	pool, err := NewPool(ctx, cfg)
	if err != nil {
		return err
	}
	globalPool = pool
	return nil
}

// ClosePool closes the global pool. Safe to call on a nil pool.
func ClosePool() {
	if globalPool != nil {
		globalPool.Close()
		globalPool = nil
	}
}

// NewPool creates and validates a pgxpool connection pool.
// Returns an error if the database is unreachable.
func NewPool(ctx context.Context, cfg Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database URL: %w", err)
	}

	poolCfg.MaxConns = 20
	poolCfg.MinConns = 2
	poolCfg.MaxConnLifetime = 1 * time.Hour
	poolCfg.MaxConnIdleTime = 30 * time.Minute
	poolCfg.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	logger.Log.Info().Msg("database: connection pool established")
	return pool, nil
}
