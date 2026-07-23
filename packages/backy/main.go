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

	"verso/backy/database"
	authfeat "verso/backy/features/auth"
	collabfeat "verso/backy/features/collab"
	dfeat "verso/backy/features/debug"
	gfeat "verso/backy/features/group"
	mfafeat "verso/backy/features/mfa"
	notifeat "verso/backy/features/notification"
	pfeat "verso/backy/features/page"
	profilefeat "verso/backy/features/profile"
	pushfeat "verso/backy/features/push"
	sfeat "verso/backy/features/space"
	ssfeat "verso/backy/features/systemsettings"
	ufeat "verso/backy/features/user"
	wsfeat "verso/backy/features/workspace"
	"verso/backy/handlers"
	"verso/backy/middleware"
	"verso/backy/repositories"
	"verso/backy/shared/auth"
	"verso/backy/shared/logger"
	"verso/backy/shared/storage"
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
	var storageClient *storage.Client
	if !dbAvailable {
		log.Warn().Err(dbErr).Msg("database init warning, blog endpoints will be unavailable")
	} else {
		pool := database.GetPool()
		if err := database.MigrateUp(context.Background(), pool); err != nil {
			log.Fatal().Err(err).Msg("migration failed")
		}
		// Ensure S3 buckets exist
		var s3Client *storage.Client
		s3Client, err = storage.NewClient()
		if err != nil {
			log.Warn().Err(err).Msg("storage init warning, file uploads will be unavailable")
		} else {
			if err := s3Client.EnsureBuckets(context.Background()); err != nil {
				log.Warn().Err(err).Msg("bucket ensure warning, file uploads may be unavailable")
			}
			storageClient = s3Client
		}
	}

	// Create handlers with configuration
	cfg := handlers.Config{
		GitHubToken:    os.Getenv("GITHUB_TOKEN"),
		GitHubUsername: getEnvOrDefault("GITHUB_USERNAME", "parazeeknova"),
	}

	var h *handlers.Handlers
	var notificationService *notifeat.NotificationService
	var hub *notifeat.NotificationHub
	var workspaceService *wsfeat.WorkspaceService
	var spaceService *sfeat.SpaceService
	var groupService *gfeat.GroupService
	var pageService *pfeat.PageService
	var favRepo *repositories.SpaceFavoriteRepo
	var pageFavRepo *repositories.PageFavoriteRepo
	var collabService *collabfeat.CollabService
	if dbAvailable {
		pool := database.GetPool()
		pageRepo := repositories.NewPageRepo(pool)
		pageWatcherRepo := repositories.NewPageWatcherRepo()
		pageHistoryRepo := repositories.NewPageHistoryRepo(pool)
		spaceRepo := repositories.NewSpaceRepo()
		workspaceRepo := repositories.NewWorkspaceRepo()
		groupRepo := repositories.NewGroupRepo()
		favRepo = repositories.NewSpaceFavoriteRepo()
		pageFavRepo = repositories.NewPageFavoriteRepo()
		pageService = pfeat.NewPageService(pageRepo, pageWatcherRepo, pageHistoryRepo, spaceRepo, groupRepo)
		spaceService = sfeat.NewSpaceService(spaceRepo, pageRepo, groupRepo)
		workspaceService = wsfeat.NewWorkspaceService(workspaceRepo, spaceRepo, groupRepo)
		groupService = gfeat.NewGroupService(groupRepo, workspaceRepo)

		// Notification service
		notifRepo := repositories.NewNotificationRepo()
		pushSubRepo := repositories.NewPushSubscriptionRepo()
		notificationService = notifeat.NewNotificationService(notifRepo, pushSubRepo, repositories.NewUserRepo())

		// SSE hub for real-time notification streaming
		hub = notifeat.NewNotificationHub()
		notificationService.SetHub(hub)

		// Wire notification service into domain services
		workspaceService.SetNotifier(notificationService)
		spaceService.SetNotifier(notificationService)
		groupService.SetNotifier(notificationService)
		pageService.SetNotifier(notificationService)

		// Yjs Collaboration Service
		pageShareRepo := repositories.NewPageShareRepo()
		collabService = collabfeat.NewCollabService(pool, pageRepo, spaceRepo, pageShareRepo)
		if notificationService != nil {
			collabService.SetNotifier(notificationService)
		}

		h = handlers.NewWithDB(cfg, pageService, spaceService, workspaceService, groupService)
		h.SetNotifier(notificationService)
		h.SetPageFavoriteRepo(pageFavRepo)
	} else {
		h = handlers.New(cfg)
	}
	if storageClient != nil {
		h.SetStorageClient(storageClient)
		if spaceService != nil {
			spaceService.SetStorageClient(storageClient)
		}
	}

	// Create auth service and handlers
	authService := authfeat.NewAuthService()
	if workspaceService != nil {
		authService.SetWorkspaceService(workspaceService)
	}
	mfaService := mfafeat.NewMFAService(interface{}(authService))
	authHandlers := authfeat.NewAuthHandlers(authService, mfaService)
	profileHandlers := profilefeat.NewProfileHandlers(authService)
	mfaHandlers := mfafeat.NewMFAHandlers(mfaService)

	if notificationService != nil {
		profileHandlers.SetNotifier(notificationService)
		mfaHandlers.SetNotifier(notificationService)
	}

	var notifHandlers *notifeat.NotificationHandlers
	var pushHandlers *pushfeat.PushSubscriptionHandlers
	if notificationService != nil {
		notifHandlers = notifeat.NewNotificationHandlers(notificationService, hub)
		pushHandlers = pushfeat.NewPushSubscriptionHandlers(notificationService)
	}

	spaceHandlers := sfeat.NewSpaceHandlersWithFav(spaceService, workspaceService, favRepo)
	workspaceHandlers := wsfeat.NewWorkspaceHandlers(workspaceService)
	groupHandlers := gfeat.NewGroupHandlers(groupService, workspaceService)
	userHandlers := ufeat.NewUserHandlers()
	debugHandlers := dfeat.NewDebugHandlers()

	r := gin.New()

	// Zerolog request logging middleware
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery
		if strings.Contains(rawQuery, "token=") {
			queryVals := c.Request.URL.Query()
			if queryVals.Has("token") {
				queryVals.Set("token", "[REDACTED]")
				rawQuery = queryVals.Encode()
			}
		}

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

		// Public Shared Pages
		api.GET("/shares/:token", h.GetPublicShare)
		api.GET("/short/:shortCode", h.GetPublicShort)

		if dbAvailable && collabService != nil {
			api.POST("/shares/:token/presence", collabService.HandleShareHeartbeatPresence)
			api.GET("/shares/:token/presence", collabService.HandleShareGetPresence)
			api.POST("/shares/:token/presence/leave", collabService.HandleLeavePresence)
			api.POST("/pages/:id/presence", collabService.HandleHeartbeatPresence)
			api.GET("/pages/:id/presence", collabService.HandleGetPresence)
			api.POST("/pages/:id/presence/leave", collabService.HandleLeavePresence)
		}

		// Auth routes (public)
		authHandlers.RegisterRoutes(api)
		// Login is rate-limited separately
		api.POST("/auth/login", middleware.RateLimitLogin(), authHandlers.Login)
		// MFA verification (public, requires mfa challenge cookie)
		api.POST("/auth/mfa/verify", authHandlers.VerifyMFA)

		// Yjs Collaboration WebSocket endpoint (handles both auth & shared pages)
		if dbAvailable && collabService != nil {
			r.GET("/ws/collab", collabService.ServeWS)
			r.GET("/ws/collab/*room", collabService.ServeWS)
			api.GET("/collab/ws", collabService.ServeWS)
			api.GET("/collab/ws/*room", collabService.ServeWS)
		}

		// Console routes (protected)
		console := api.Group("/console")
		console.Use(middleware.AuthRequired(authService))
		{
			if dbAvailable && collabService != nil {
				console.POST("/pages/:id/presence", collabService.HandleHeartbeatPresence)
				console.GET("/pages/:id/presence", collabService.HandleGetPresence)
				console.POST("/pages/:id/presence/leave", collabService.HandleLeavePresence)
			}
			// Collab token endpoint
			console.POST("/auth/collab-token", authHandlers.CollabToken)

			// Profile
			profileHandlers.RegisterRoutes(console)

			// MFA
			mfaHandlers.RegisterRoutes(console)

			// Workspaces
			console.GET("/workspaces", workspaceHandlers.GetWorkspaces)
			console.POST("/workspaces", workspaceHandlers.CreateWorkspace)
			console.PUT("/workspaces/:id", workspaceHandlers.UpdateWorkspace)
			console.DELETE("/workspaces/:id", workspaceHandlers.DeleteWorkspace)

			// Spaces
			console.GET("/spaces", spaceHandlers.GetSpaces)
			console.POST("/spaces", spaceHandlers.CreateSpace)
			console.GET("/spaces/by-slug/:slug", spaceHandlers.GetSpaceBySlug)
			console.PUT("/spaces/:id", spaceHandlers.UpdateSpace)
			console.DELETE("/spaces/:id", spaceHandlers.DeleteSpace)
			console.GET("/spaces/:id/members", spaceHandlers.GetSpaceMembers)
			console.POST("/spaces/:id/members/:userId", spaceHandlers.AddSpaceMember)
			console.PUT("/spaces/:id/members/:userId", spaceHandlers.UpdateSpaceMemberRole)
			console.DELETE("/spaces/:id/members/:userId", spaceHandlers.RemoveSpaceMember)
			console.POST("/spaces/:id/groups/:groupId", spaceHandlers.AddSpaceGroup)
			console.PUT("/spaces/:id/groups/:groupId", spaceHandlers.UpdateSpaceGroupRole)
			console.DELETE("/spaces/:id/groups/:groupId", spaceHandlers.RemoveSpaceGroup)

			// Unsplash proxy
			console.GET("/unsplash/search", spaceHandlers.SearchUnsplash)

			// Space favorites
			console.POST("/spaces/:id/favorite", spaceHandlers.ToggleFavorite)
			console.GET("/spaces/:id/favorited", spaceHandlers.IsFavorited)
			console.GET("/spaces/favorites", spaceHandlers.GetFavoritedSpaces)

			// Groups
			console.GET("/workspaces/:workspaceId/groups", groupHandlers.GetGroups)
			console.POST("/workspaces/:workspaceId/groups", groupHandlers.CreateGroup)
			console.PUT("/groups/:id", groupHandlers.UpdateGroup)
			console.DELETE("/groups/:id", groupHandlers.DeleteGroup)
			console.GET("/groups/:id/members", groupHandlers.GetGroupMembers)
			console.POST("/groups/:id/members", groupHandlers.AddGroupMember)
			console.DELETE("/groups/:id/members/:userId", groupHandlers.RemoveGroupMember)

			// Page CRUD
			console.GET("/pages", h.GetConsolePages)
			console.POST("/pages", h.CreateConsolePage)
			console.GET("/pages/:id", h.GetConsolePage)
			console.PUT("/pages/:id", h.UpdateConsolePage)
			console.DELETE("/pages/:id", h.DeleteConsolePage)
			console.POST("/upload", h.UploadFile)
			console.GET("/files/:bucket/:filename", h.GetUploadedFile)

			// Publish / Unpublish
			console.POST("/pages/:id/publish", h.PublishConsolePage)
			console.POST("/pages/:id/unpublish", h.UnpublishConsolePage)

			// Page Sharing
			console.GET("/pages/:id/share", h.GetConsolePageShare)
			console.PUT("/pages/:id/share", h.UpdateConsolePageShare)
			console.POST("/pages/:id/share/shorten", h.ShortenConsolePageShare)

			// Page Presence
			if collabService != nil {
				console.POST("/pages/:id/presence", collabService.HandleHeartbeatPresence)
				console.GET("/pages/:id/presence", collabService.HandleGetPresence)
				console.POST("/pages/:id/presence/leave", collabService.HandleLeavePresence)
			}

			// Page Tree
			console.GET("/pages/tree", h.GetConsolePageTree)
			console.GET("/pages/:id/children", h.GetConsolePageChildren)
			console.PUT("/pages/:id/move", h.MoveConsolePage)

			// Page History
			console.GET("/pages/:id/history", h.GetConsolePageHistory)
			console.GET("/pages/:id/history/:historyId", h.GetConsolePageHistoryEntry)
			console.POST("/pages/:id/restore", h.RestoreConsolePage)
			console.DELETE("/pages/:id/history", h.DeleteConsolePageHistory)
			console.DELETE("/pages/:id/history/:historyId", h.DeleteConsolePageHistoryEntry)

			// Page favorites
			console.POST("/pages/:id/favorite", h.TogglePageFavorite)
			console.GET("/pages/:id/favorited", h.IsPageFavorited)
			console.POST("/pages/:id/watch", h.TogglePageWatch)
			console.GET("/pages/:id/watching", h.IsPageWatched)
			console.GET("/pages/favorites", h.GetFavoritedPages)
			console.GET("/spaces/:id/pages/by-slug/:slugId", h.GetConsolePageBySlug)

			// Notifications
			if notifHandlers != nil {
				notifHandlers.RegisterRoutes(console)
			}

			// Push subscriptions
			if pushHandlers != nil {
				pushHandlers.RegisterRoutes(console)
			}

			// System settings (owner-only, requires DB)
			if dbAvailable {
				systemSettingsHandlers := ssfeat.NewSystemSettingsHandlers()
				systemSettings := console.Group("/system-settings")
				systemSettings.Use(middleware.OwnerRequired())
				{
					systemSettings.GET("", systemSettingsHandlers.GetSettings)
					systemSettings.PATCH("", systemSettingsHandlers.UpdateSetting)
				}
			}

			// Debug (owner-only, gated by system_setting debug_api, requires DB)
			if dbAvailable {
				debug := console.Group("/debug")
				debug.Use(middleware.OwnerRequired())
				debug.Use(middleware.DebugAPIRequired())
				{
					debug.GET("/tables", debugHandlers.GetDebugTables)
					debug.GET("/tables/:tableName", debugHandlers.GetDebugTableData)
					debug.DELETE("/tables/:tableName", debugHandlers.DeleteDebugTableData)
					debug.POST("/tables/:tableName/rows", debugHandlers.DeleteDebugTableRows)
					debug.GET("/storage/orphans", debugHandlers.GetStorageOrphanReport)
					debug.GET("/storage/objects", debugHandlers.GetStorageObjects)
				}
			}

			// Users (admin+ only)
			admin := console.Group("/users")
			admin.Use(middleware.AdminRequired())
			{
				admin.GET("", userHandlers.GetUsers)
				admin.PUT("/:id/role", userHandlers.UpdateUserRole)
				admin.PUT("/:id/active", userHandlers.UpdateUserActive)
				admin.DELETE("/:id", userHandlers.DeleteUser)
			}

			// User lookup (any authenticated user)
			console.GET("/users/:id", userHandlers.GetUserByID)
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
