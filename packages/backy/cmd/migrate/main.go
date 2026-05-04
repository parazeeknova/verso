package main

import (
	"context"
	"os"

	"github.com/joho/godotenv"

	"verso/backy/database"
	"verso/backy/logger"
)

func main() {
	_ = godotenv.Load()

	log := logger.Log

	if len(os.Args) < 2 {
		log.Fatal().Msg("usage: go run ./cmd/migrate <up|reset>")
	}

	command := os.Args[1]

	cfg, err := database.ConfigFromEnv()
	if err != nil {
		log.Fatal().Err(err).Msg("config error")
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("pool error")
	}
	defer pool.Close()

	switch command {
	case "up":
		if err := database.MigrateUp(ctx, pool); err != nil {
			log.Fatal().Err(err).Msg("migrate up failed")
		}
	case "reset":
		if err := database.MigrateReset(ctx, pool); err != nil {
			log.Fatal().Err(err).Msg("migrate reset failed")
		}
	default:
		log.Fatal().Str("command", command).Msg("unknown command, use 'up' or 'reset'")
	}

	log.Info().Msg("migration complete")
}
