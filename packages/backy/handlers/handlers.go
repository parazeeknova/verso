package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/sync/singleflight"

	"verso/backy/cache"
	"verso/backy/logger"
	"verso/backy/middleware"
	"verso/backy/models"
	"verso/backy/repositories"
	"verso/backy/services"
	"verso/backy/store"
)

// Handlers holds all HTTP handlers
type Handlers struct {
	githubService *services.GitHubService
	statsCache    *cache.StatsCache
	config        Config
	statsGroup    singleflight.Group

	// Optional DB-backed services; if nil, falls back to file-based store
	pageService      *services.PageService
	spaceService     *services.SpaceService
	workspaceService *services.WorkspaceService
}

// Config holds application configuration
type Config struct {
	GitHubToken    string
	GitHubUsername string
}

// New creates a new handlers instance
func New(cfg Config) *Handlers {
	return &Handlers{
		githubService: services.NewGitHubService(10 * time.Minute),
		statsCache:    cache.NewStatsCache(10 * time.Minute),
		config:        cfg,
	}
}

// NewWithDB creates a new handlers instance with database-backed services.
func NewWithDB(cfg Config, pageService *services.PageService, spaceService *services.SpaceService, workspaceService *services.WorkspaceService) *Handlers {
	h := New(cfg)
	h.pageService = pageService
	h.spaceService = spaceService
	h.workspaceService = workspaceService
	return h
}

// Health returns health check handler
func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// MigrationStatus is a handler that signals to infrastructure tooling
// that DB migrations have completed successfully.
func (h *Handlers) MigrationStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "complete"})
}

// GetProfile returns profile data
func (h *Handlers) GetProfile(c *gin.Context) {
	c.JSON(http.StatusOK, store.Profile)
}

// GetExperience returns experience data
func (h *Handlers) GetExperience(c *gin.Context) {
	c.JSON(http.StatusOK, store.Experiences)
}

// GetProjects returns projects data
func (h *Handlers) GetProjects(c *gin.Context) {
	c.JSON(http.StatusOK, store.Projects)
}

// GetBlogPost returns a blog post by slug from the database.
func (h *Handlers) GetBlogPost(c *gin.Context) {
	slug := c.Param("slug")

	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "blog service unavailable"})
		return
	}

	post, err := h.pageService.GetBlogPost(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, services.ErrBlogPostNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "blog post not found"})
			return
		}
		logger.Log.Error().Str("slug", slug).Err(err).Msg("blog post load error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load blog post"})
		return
	}

	c.JSON(http.StatusOK, post)
}

// GetBlogManifest returns the blog manifest from the database.
func (h *Handlers) GetBlogManifest(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "blog service unavailable"})
		return
	}

	manifest, err := h.pageService.GetBlogManifest(c.Request.Context())
	if err != nil {
		logger.Log.Error().Err(err).Msg("blog manifest error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load blog manifest"})
		return
	}

	if manifest == nil {
		manifest = []models.BlogManifestSection{}
	}

	c.JSON(http.StatusOK, manifest)
}

// GetGitHubStats returns GitHub statistics with caching
func (h *Handlers) GetGitHubStats(c *gin.Context) {
	if h.config.GitHubToken == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GITHUB_TOKEN not configured"})
		return
	}

	username := h.config.GitHubUsername

	if cached, ok := h.statsCache.Get(username); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	result, err, _ := h.statsGroup.Do(username, func() (interface{}, error) {
		stats, computeErr := h.githubService.ComputeStats(c.Request.Context(), h.config.GitHubToken, username)
		if computeErr != nil {
			return nil, computeErr
		}
		h.statsCache.Set(username, stats)
		return stats, nil
	})

	if err != nil {
		logger.Log.Error().Str("user", username).Err(err).Msg("GitHub stats error")
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch GitHub stats"})
		return
	}

	stats := result.(models.GitHubStats)
	c.JSON(http.StatusOK, stats)
}

// ConsolePageSummary is the lightweight response for the console page list.
type ConsolePageSummary struct {
	ID          string `json:"id"`
	SlugID      string `json:"slugId"`
	Title       string `json:"title"`
	Icon        string `json:"icon"`
	IsPublished bool   `json:"isPublished"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// GetConsolePages returns all pages for the console (requires auth via middleware).
func (h *Handlers) GetConsolePages(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusOK, []ConsolePageSummary{})
		return
	}

	pages, err := h.pageService.ListAllPages(c.Request.Context())
	if err != nil {
		logger.Log.Error().Err(err).Msg("console pages error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load pages"})
		return
	}

	summaries := make([]ConsolePageSummary, 0, len(pages))
	for _, p := range pages {
		summaries = append(summaries, ConsolePageSummary{
			ID:          p.ID,
			SlugID:      p.SlugID,
			Title:       p.Title,
			Icon:        p.Icon,
			IsPublished: p.IsPublished,
			CreatedAt:   p.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   p.UpdatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, summaries)
}

// GetConsolePage returns a single page by ID for the console (requires auth via middleware).
func (h *Handlers) GetConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}

	id := c.Param("id")

	page, err := h.pageService.GetPageByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("console page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           page.ID,
		"slugId":       page.SlugID,
		"title":        page.Title,
		"icon":         page.Icon,
		"coverPhoto":   page.CoverPhoto,
		"contentJson":  page.ContentJSON,
		"textContent":  page.TextContent,
		"position":     page.Position,
		"isPublished":  page.IsPublished,
		"parentPageId": page.ParentPageID,
		"createdAt":    page.CreatedAt.Format(time.RFC3339),
		"updatedAt":    page.UpdatedAt.Format(time.RFC3339),
	})
}

// --- Console Page Mutations ---

// CreateConsolePageRequest is the request body for creating a page.
type CreateConsolePageRequest struct {
	SlugID       string  `json:"slugId" binding:"required"`
	Title        string  `json:"title" binding:"required"`
	Icon         string  `json:"icon"`
	SpaceID      string  `json:"spaceId" binding:"required"`
	ParentPageID *string `json:"parentPageId"`
}

// CreateConsolePage handles POST /api/console/pages.
func (h *Handlers) CreateConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	var req CreateConsolePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	now := time.Now().UTC()

	page := models.Page{
		ID:           uuid.New().String(),
		SlugID:       req.SlugID,
		Title:        req.Title,
		Icon:         req.Icon,
		ParentPageID: req.ParentPageID,
		SpaceID:      req.SpaceID,
		CreatorID:    userID,
		CreatedAt:    now,
		UpdatedAt:    now,
		ContentJSON:  json.RawMessage("{}"),
	}

	if err := h.pageService.CreatePage(c.Request.Context(), page); err != nil {
		logger.Log.Error().Err(err).Msg("create page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create page"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":           page.ID,
		"slugId":       page.SlugID,
		"title":        page.Title,
		"icon":         page.Icon,
		"contentJson":  page.ContentJSON,
		"textContent":  page.TextContent,
		"position":     page.Position,
		"isPublished":  page.IsPublished,
		"parentPageId": page.ParentPageID,
		"createdAt":    page.CreatedAt.Format(time.RFC3339),
		"updatedAt":    page.UpdatedAt.Format(time.RFC3339),
	})
}

// UpdateConsolePageRequest is the request body for updating a page.
type UpdateConsolePageRequest struct {
	Title       *string          `json:"title"`
	Icon        *string          `json:"icon"`
	CoverPhoto  *string          `json:"coverPhoto"`
	ContentJSON *json.RawMessage `json:"contentJson"`
	TextContent *string          `json:"textContent"`
}

// UpdateConsolePage handles PUT /api/console/pages/:id.
func (h *Handlers) UpdateConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	var req UpdateConsolePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := services.UpdatePageInput{
		Title:       req.Title,
		Icon:        req.Icon,
		CoverPhoto:  req.CoverPhoto,
		ContentJSON: req.ContentJSON,
		TextContent: req.TextContent,
	}

	page, err := h.pageService.UpdatePage(c.Request.Context(), id, userID, input)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("update page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           page.ID,
		"slugId":       page.SlugID,
		"title":        page.Title,
		"icon":         page.Icon,
		"coverPhoto":   page.CoverPhoto,
		"contentJson":  page.ContentJSON,
		"textContent":  page.TextContent,
		"position":     page.Position,
		"isPublished":  page.IsPublished,
		"parentPageId": page.ParentPageID,
		"createdAt":    page.CreatedAt.Format(time.RFC3339),
		"updatedAt":    page.UpdatedAt.Format(time.RFC3339),
	})
}

// DeleteConsolePage handles DELETE /api/console/pages/:id.
func (h *Handlers) DeleteConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	if err := h.pageService.DeletePage(c.Request.Context(), id, userID); err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("delete page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// PublishConsolePage handles POST /api/console/pages/:id/publish.
func (h *Handlers) PublishConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	page, err := h.pageService.PublishPage(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("publish page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          page.ID,
		"isPublished": page.IsPublished,
		"updatedAt":   page.UpdatedAt.Format(time.RFC3339),
	})
}

// UnpublishConsolePage handles POST /api/console/pages/:id/unpublish.
func (h *Handlers) UnpublishConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	page, err := h.pageService.UnpublishPage(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("unpublish page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unpublish page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          page.ID,
		"isPublished": page.IsPublished,
		"updatedAt":   page.UpdatedAt.Format(time.RFC3339),
	})
}

// --- Page Tree Endpoints ---

// GetConsolePageTree handles GET /api/console/pages/tree.
func (h *Handlers) GetConsolePageTree(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusOK, []models.PageTreeItem{})
		return
	}

	spaceID := c.Query("spaceId")
	if spaceID == "" {
		c.JSON(http.StatusOK, []models.PageTreeItem{})
		return
	}

	tree, err := h.pageService.ListTree(c.Request.Context(), spaceID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("page tree error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load page tree"})
		return
	}

	if tree == nil {
		tree = []models.PageTreeItem{}
	}

	c.JSON(http.StatusOK, tree)
}

// GetConsolePageChildren handles GET /api/console/pages/:id/children.
func (h *Handlers) GetConsolePageChildren(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusOK, []models.PageTreeItem{})
		return
	}

	id := c.Param("id")
	children, err := h.pageService.ListChildPages(c.Request.Context(), id)
	if err != nil {
		logger.Log.Error().Str("id", id).Err(err).Msg("page children error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load children"})
		return
	}

	if children == nil {
		children = []models.PageTreeItem{}
	}

	c.JSON(http.StatusOK, children)
}

// MoveConsolePageRequest is the request body for moving a page.
type MoveConsolePageRequest struct {
	ParentPageID *string `json:"parentPageId"`
	Position     *string `json:"position"`
}

// MoveConsolePage handles PUT /api/console/pages/:id/move.
func (h *Handlers) MoveConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	var req MoveConsolePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	page, err := h.pageService.MovePage(c.Request.Context(), id, req.ParentPageID, req.Position, userID)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("move page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to move page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           page.ID,
		"position":     page.Position,
		"parentPageId": page.ParentPageID,
		"updatedAt":    page.UpdatedAt.Format(time.RFC3339),
	})
}

// --- Page History Endpoints ---

// GetConsolePageHistory handles GET /api/console/pages/:id/history.
func (h *Handlers) GetConsolePageHistory(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusOK, []models.PageHistory{})
		return
	}

	id := c.Param("id")

	// Verify the page exists first.
	if _, err := h.pageService.GetPageByID(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("page history error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history"})
		return
	}

	history, err := h.pageService.GetPageHistory(c.Request.Context(), id)
	if err != nil {
		logger.Log.Error().Str("id", id).Err(err).Msg("page history list error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history"})
		return
	}

	if history == nil {
		history = []models.PageHistory{}
	}

	// Transform to camelCase JSON.
	type historyItem struct {
		ID          string          `json:"id"`
		PageID      string          `json:"pageId"`
		Title       string          `json:"title"`
		ContentJSON json.RawMessage `json:"contentJson"`
		TextContent string          `json:"textContent"`
		Operation   string          `json:"operation"`
		CreatedByID string          `json:"createdById"`
		CreatedAt   string          `json:"createdAt"`
	}

	result := make([]historyItem, 0, len(history))
	for _, h := range history {
		result = append(result, historyItem{
			ID:          h.ID,
			PageID:      h.PageID,
			Title:       h.Title,
			ContentJSON: h.ContentJSON,
			TextContent: h.TextContent,
			Operation:   h.Operation,
			CreatedByID: h.CreatedByID,
			CreatedAt:   h.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, result)
}

// GetConsolePageHistoryEntry handles GET /api/console/pages/:id/history/:historyId.
func (h *Handlers) GetConsolePageHistoryEntry(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	historyID := c.Param("historyId")

	entry, err := h.pageService.GetHistoryEntry(c.Request.Context(), historyID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageHistoryNotFound) || errors.Is(err, services.ErrHistoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "history entry not found"})
			return
		}
		logger.Log.Error().Str("id", historyID).Err(err).Msg("history entry error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          entry.ID,
		"pageId":      entry.PageID,
		"title":       entry.Title,
		"contentJson": entry.ContentJSON,
		"textContent": entry.TextContent,
		"operation":   entry.Operation,
		"createdById": entry.CreatedByID,
		"createdAt":   entry.CreatedAt.Format(time.RFC3339),
	})
}

// RestoreConsolePage handles POST /api/console/pages/:id/restore.
func (h *Handlers) RestoreConsolePage(c *gin.Context) {
	if h.pageService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "page service unavailable"})
		return
	}

	pageID := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	var req struct {
		HistoryID string `json:"historyId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "historyId is required"})
		return
	}

	page, err := h.pageService.RestorePage(c.Request.Context(), pageID, req.HistoryID, userID)
	if err != nil {
		if errors.Is(err, services.ErrPageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
			return
		}
		if errors.Is(err, repositories.ErrPageHistoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "history entry not found"})
			return
		}
		logger.Log.Error().Str("id", pageID).Err(err).Msg("restore page error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          page.ID,
		"title":       page.Title,
		"contentJson": page.ContentJSON,
		"textContent": page.TextContent,
		"updatedAt":   page.UpdatedAt.Format(time.RFC3339),
	})
}

// GetStats returns aggregate counts (public, no auth required).
func (h *Handlers) GetStats(c *gin.Context) {
	pages := 0
	posts := 0
	readmes := 0

	if h.pageService != nil {
		all, err := h.pageService.ListAllPages(c.Request.Context())
		if err != nil {
			logger.Log.Error().Err(err).Msg("stats: list all pages error")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load stats"})
			return
		}
		pages = len(all)
		for _, p := range all {
			if p.IsPublished {
				posts++
			}
		}
	}

	for _, p := range store.Projects {
		if p.ReadmeURL != "" {
			readmes++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"pages":   pages,
		"posts":   posts,
		"readmes": readmes,
	})
}
