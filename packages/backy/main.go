package main

import (
	"context"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"

	"github.com/verso/backy/auth"
	"github.com/verso/backy/database"
	"github.com/verso/backy/handlers"
	"github.com/verso/backy/logger"
	"github.com/verso/backy/middleware"
	"github.com/verso/backy/repositories"
	"github.com/verso/backy/services"
	"github.com/verso/backy/storage"
)

func main() {
	_ = godotenv.Load()

	log := logger.Log

	// Validate JWT secret before starting
	if err := auth.ValidateSecret(); err != nil {
		log.Fatal().Err(err).Msg("JWT secret validation failed")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "7000"
	}

	// Get allowed origins from env
	webOrigin := os.Getenv("WEB_ORIGIN")
	var allowOrigins []string
	if webOrigin != "" {
		allowOrigins = strings.Split(webOrigin, ",")
		filtered := make([]string, 0, len(allowOrigins))
		for _, origin := range allowOrigins {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				filtered = append(filtered, origin)
			}
		}
		allowOrigins = filtered
	} else {
		allowOrigins = []string{
			"http://localhost:3000",
			"http://localhost:7000",
		}
	}

	for _, origin := range allowOrigins {
		if origin == "*" {
			log.Fatal().Msg("CORS wildcard '*' cannot be used with AllowCredentials=true. Please specify explicit origins or set AllowCredentials to false.")
		}
	}

	// Initialize database pool
	dbCfg, err := database.ConfigFromEnv()
	if err != nil {
		log.Fatal().Err(err).Msg("database config error")
	}
	dbErr := database.InitPool(context.Background(), dbCfg)
	dbAvailable := dbErr == nil
	if !dbAvailable {
		log.Warn().Err(dbErr).Msg("database init warning, blog endpoints will be unavailable")
	} else {
		pool := database.GetPool()
		if err := database.MigrateUp(context.Background(), pool); err != nil {
			log.Fatal().Err(err).Msg("migration failed")
		}
		// Ensure S3 buckets exist
		s3Client, err := storage.NewClient()
		if err != nil {
			log.Warn().Err(err).Msg("storage init warning, file uploads will be unavailable")
		} else {
			if err := s3Client.EnsureBuckets(context.Background()); err != nil {
				log.Warn().Err(err).Msg("bucket ensure warning, file uploads may be unavailable")
			}
		}
	}

	// Create handlers with configuration
	cfg := handlers.Config{
		GitHubToken:    os.Getenv("GITHUB_TOKEN"),
		GitHubUsername: getEnvOrDefault("GITHUB_USERNAME", "parazeeknova"),
	}

	var h *handlers.Handlers
	if dbAvailable {
		pool := database.GetPool()
		pageRepo := repositories.NewPageRepo(pool)
		pageHistoryRepo := repositories.NewPageHistoryRepo(pool)
		spaceRepo := repositories.NewSpaceRepo()
		workspaceRepo := repositories.NewWorkspaceRepo()
		pageService := services.NewPageService(pageRepo, pageHistoryRepo)
		spaceService := services.NewSpaceService(spaceRepo, pageRepo)
		workspaceService := services.NewWorkspaceService(workspaceRepo, spaceRepo)
		h = handlers.NewWithDB(cfg, pageService, spaceService, workspaceService)
	} else {
		h = handlers.New(cfg)
	}

	// Create auth service and handlers
	authService := services.NewAuthService()
	authHandlers := handlers.NewAuthHandlers(authService)
	profileHandlers := handlers.NewProfileHandlers(authService)

	r := gin.New()

	// Zerolog request logging middleware
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()

		var ev *zerolog.Event
		switch {
		case statusCode >= 500:
			ev = log.Error()
		case statusCode >= 400:
			ev = log.Warn()
		default:
			ev = log.Info()
		}

		ev.
			Str("method", method).
			Str("path", path).
			Str("query", rawQuery).
			Int("status", statusCode).
			Dur("latency", latency).
			Str("ip", clientIP).
			Int("body_size", c.Writer.Size()).
			Msg("request")
	})

	// Recovery middleware with zerolog
	r.Use(gin.CustomRecovery(func(c *gin.Context, recovered any) {
		log.Error().
			Any("panic", recovered).
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Msg("panic recovered")
		c.AbortWithStatus(500)
	}))

	trustedProxies := os.Getenv("TRUSTED_PROXIES")
	var proxyList []string
	if trustedProxies == "*" {
		proxyList = []string{"*"}
	} else if trustedProxies != "" {
		proxyList = strings.Split(trustedProxies, ",")
	}
	if err := r.SetTrustedProxies(proxyList); err != nil {
		log.Fatal().Err(err).Msg("failed to set trusted proxies")
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.GET("/health", h.Health)

	// Internal infrastructure endpoint — signals migrations are complete.
	r.GET("/internal/migrations/status", h.MigrationStatus)

	// API routes
	api := r.Group("/api")
	{
		api.GET("/profile", h.GetProfile)
		api.GET("/experience", h.GetExperience)
		api.GET("/projects", h.GetProjects)
		api.GET("/github/stats", h.GetGitHubStats)
		api.GET("/stats", h.GetStats)
		api.GET("/blogs", h.GetBlogManifest)
		api.GET("/blogs/:slug", h.GetBlogPost)

		// Auth routes (public)
		authHandlers.RegisterRoutes(api)
		// Login is rate-limited separately
		api.POST("/auth/login", middleware.RateLimitLogin(), authHandlers.Login)

		// Console routes (protected)
		console := api.Group("/console")
		console.Use(middleware.AuthRequired(authService))
		{
			// Profile
			profileHandlers.RegisterRoutes(console)

			// Workspaces
			console.GET("/workspaces", h.GetWorkspaces)
			console.POST("/workspaces", h.CreateWorkspace)
			console.PUT("/workspaces/:id", h.UpdateWorkspace)
			console.DELETE("/workspaces/:id", h.DeleteWorkspace)

			// Spaces
			console.GET("/spaces", h.GetSpaces)
			console.POST("/spaces", h.CreateSpace)
			console.PUT("/spaces/:id", h.UpdateSpace)
			console.DELETE("/spaces/:id", h.DeleteSpace)

			// Page CRUD
			console.GET("/pages", h.GetConsolePages)
			console.POST("/pages", h.CreateConsolePage)
			console.GET("/pages/:id", h.GetConsolePage)
			console.PUT("/pages/:id", h.UpdateConsolePage)
			console.DELETE("/pages/:id", h.DeleteConsolePage)

			// Publish / Unpublish
			console.POST("/pages/:id/publish", h.PublishConsolePage)
			console.POST("/pages/:id/unpublish", h.UnpublishConsolePage)

			// Page Tree
			console.GET("/pages/tree", h.GetConsolePageTree)
			console.GET("/pages/:id/children", h.GetConsolePageChildren)
			console.PUT("/pages/:id/move", h.MoveConsolePage)

			// Page History
			console.GET("/pages/:id/history", h.GetConsolePageHistory)
			console.GET("/pages/:id/history/:historyId", h.GetConsolePageHistoryEntry)
			console.POST("/pages/:id/restore", h.RestoreConsolePage)

			// Debug
			console.GET("/debug/tables", h.GetDebugTables)
			console.GET("/debug/tables/:tableName", h.GetDebugTableData)
			console.DELETE("/debug/tables/:tableName", h.DeleteDebugTableData)
			console.POST("/debug/tables/:tableName/rows", h.DeleteDebugTableRows)
		}
	}

	log.Info().Str("port", port).Msg("server starting")
	if err := r.Run(":" + port); err != nil {
		log.Fatal().Err(err).Msg("server failed")
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
