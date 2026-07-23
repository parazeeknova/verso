package space

import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/database/models"
	wsfeat "verso/backy/features/workspace"
	"verso/backy/middleware"
	"verso/backy/repositories"
	"verso/backy/shared/logger"
)

type rateLimiter struct {
	mu       sync.Mutex
	lastCall map[string]time.Time
	interval time.Duration
}

func newRateLimiter(interval time.Duration) *rateLimiter {
	return &rateLimiter{
		lastCall: make(map[string]time.Time),
		interval: interval,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	if last, ok := rl.lastCall[key]; ok && now.Sub(last) < rl.interval {
		return false
	}
	rl.lastCall[key] = now
	return true
}

type SpaceHandlers struct {
	workspaceService *wsfeat.WorkspaceService
	spaceService     *SpaceService
	favRepo          *repositories.SpaceFavoriteRepo
	unsplashLimiter  *rateLimiter
}

func NewSpaceHandlers(svc *SpaceService, wsSvc *wsfeat.WorkspaceService) *SpaceHandlers {
	return &SpaceHandlers{spaceService: svc, workspaceService: wsSvc, unsplashLimiter: newRateLimiter(2 * time.Second)}
}

func NewSpaceHandlersWithFav(svc *SpaceService, wsSvc *wsfeat.WorkspaceService, favRepo *repositories.SpaceFavoriteRepo) *SpaceHandlers {
	return &SpaceHandlers{spaceService: svc, workspaceService: wsSvc, favRepo: favRepo, unsplashLimiter: newRateLimiter(2 * time.Second)}
}

// --- Space Handlers ---

// GetSpaces handles GET /api/console/spaces.
func (h *SpaceHandlers) GetSpaces(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusOK, []models.Space{})
		return
	}

	workspaceID := c.Query("workspaceId")
	if workspaceID == "" {
		c.JSON(http.StatusOK, []models.Space{})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if err := h.workspaceService.RequireMembership(c.Request.Context(), workspaceID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}

	spaces, err := h.spaceService.ListSpaces(c.Request.Context(), workspaceID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("list spaces error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list spaces"})
		return
	}

	c.JSON(http.StatusOK, spaces)
}

// GetSpaceBySlug handles GET /api/console/spaces/by-slug/:slug.
func (h *SpaceHandlers) GetSpaceBySlug(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "slug is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	space, err := h.spaceService.GetSpaceBySlug(c.Request.Context(), slug, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Err(err).Str("slug", slug).Msg("get space by slug error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get space"})
		return
	}

	c.JSON(http.StatusOK, space)
}

// GetSpaceByID handles GET /api/console/spaces/:id.
func (h *SpaceHandlers) GetSpaceByID(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	space, err := h.spaceService.GetSpaceByID(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Err(err).Str("id", id).Msg("get space by id error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get space"})
		return
	}

	c.JSON(http.StatusOK, space)
}

// CreateSpaceRequest is the request body for creating a space.
type CreateSpaceRequest struct {
	Name        string `json:"name" binding:"required"`
	Slug        string `json:"slug" binding:"required"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	WorkspaceID string `json:"workspaceId" binding:"required"`
}

// CreateSpace handles POST /api/console/spaces.
func (h *SpaceHandlers) CreateSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	var req CreateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if err := h.workspaceService.RequireOwnerOrAdmin(c.Request.Context(), req.WorkspaceID, userID); err != nil {
		if errors.Is(err, wsfeat.ErrWorkspacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Err(err).Msg("create space permission check error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create space"})
		return
	}

	space, err := h.spaceService.CreateSpace(c.Request.Context(), req.Name, req.Slug, req.Icon, req.Description, req.WorkspaceID, userID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("create space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create space"})
		return
	}

	c.JSON(http.StatusCreated, space)
}

// UpdateSpaceRequest is the request body for updating a space.
type UpdateSpaceRequest struct {
	Name        string  `json:"name" binding:"required"`
	Slug        string  `json:"slug" binding:"required"`
	Icon        string  `json:"icon"`
	Description string  `json:"description"`
	HeaderImage *string `json:"headerImage"`
}

// UpdateSpace handles PUT /api/console/spaces/:id.
func (h *SpaceHandlers) UpdateSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	var req UpdateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	headerImage := req.HeaderImage

	space, err := h.spaceService.UpdateSpace(c.Request.Context(), UpdateSpaceParams{
		ID:          id,
		Name:        req.Name,
		Slug:        req.Slug,
		Icon:        req.Icon,
		Description: req.Description,
		HeaderImage: headerImage,
		UserID:      userID,
	})
	if err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("update space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update space"})
		return
	}

	c.JSON(http.StatusOK, space)
}

// DeleteSpace handles DELETE /api/console/spaces/:id.
func (h *SpaceHandlers) DeleteSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	if err := h.spaceService.DeleteSpace(c.Request.Context(), id, userID); err != nil {
		if errors.Is(err, repositories.ErrSpaceNotEmpty) {
			c.JSON(http.StatusConflict, gin.H{"error": "space is not empty, remove pages first"})
			return
		}
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("delete space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// GetSpaceMembers handles GET /api/console/spaces/:id/members.
func (h *SpaceHandlers) GetSpaceMembers(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusOK, []models.SpaceMemberMixed{})
		return
	}

	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	if err := h.spaceService.RequireRead(c.Request.Context(), id, userID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("space members permission check error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list space members"})
		return
	}

	members, err := h.spaceService.GetSpaceMembersMixed(c.Request.Context(), id)
	if err != nil {
		logger.Log.Error().Str("id", id).Err(err).Msg("list space members error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list space members"})
		return
	}

	c.JSON(http.StatusOK, members)
}

// UpdateSpaceMemberRequest is the request body for updating a member's role.
type UpdateSpaceMemberRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateSpaceMemberRole handles PUT /api/console/spaces/:id/members/:userId.
func (h *SpaceHandlers) UpdateSpaceMemberRole(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	userID := c.Param("userId")
	actorID := middleware.GetCurrentUserID(c)

	var req UpdateSpaceMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.spaceService.UpdateSpaceMemberRole(c.Request.Context(), spaceID, userID, req.Role, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		if strings.Contains(err.Error(), "invalid role") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("userId", userID).Err(err).Msg("update space member role error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update member role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// RemoveSpaceMember handles DELETE /api/console/spaces/:id/members/:userId.
func (h *SpaceHandlers) RemoveSpaceMember(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	userID := c.Param("userId")
	actorID := middleware.GetCurrentUserID(c)

	if err := h.spaceService.RemoveSpaceMember(c.Request.Context(), spaceID, userID, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("userId", userID).Err(err).Msg("remove space member error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// AddSpaceMember handles POST /api/console/spaces/:id/members/:userId.
func (h *SpaceHandlers) AddSpaceMember(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	userID := c.Param("userId")
	actorID := middleware.GetCurrentUserID(c)

	var req UpdateSpaceMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.spaceService.AddSpaceMember(c.Request.Context(), spaceID, userID, req.Role, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("userId", userID).Err(err).Msg("add space member error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "added"})
}

// AddSpaceGroupRequest is the request body for adding a group to a space.
type AddSpaceGroupRequest struct {
	Role string `json:"role" binding:"required"`
}

// AddSpaceGroup handles POST /api/console/spaces/:id/groups/:groupId.
func (h *SpaceHandlers) AddSpaceGroup(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	groupID := c.Param("groupId")
	actorID := middleware.GetCurrentUserID(c)

	var req AddSpaceGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.spaceService.AddSpaceGroup(c.Request.Context(), spaceID, groupID, req.Role, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		if strings.Contains(err.Error(), "invalid role") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if strings.Contains(err.Error(), "group does not belong") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("groupId", groupID).Err(err).Msg("add space group error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add group to space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "added"})
}

// UpdateSpaceGroupRole handles PUT /api/console/spaces/:id/groups/:groupId.
func (h *SpaceHandlers) UpdateSpaceGroupRole(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	groupID := c.Param("groupId")
	actorID := middleware.GetCurrentUserID(c)

	var req UpdateSpaceMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.spaceService.UpdateSpaceGroupRole(c.Request.Context(), spaceID, groupID, req.Role, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		if strings.Contains(err.Error(), "invalid role") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("groupId", groupID).Err(err).Msg("update space group role error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update group role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// RemoveSpaceGroup handles DELETE /api/console/spaces/:id/groups/:groupId.
func (h *SpaceHandlers) RemoveSpaceGroup(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	spaceID := c.Param("id")
	groupID := c.Param("groupId")
	actorID := middleware.GetCurrentUserID(c)

	if err := h.spaceService.RemoveSpaceGroup(c.Request.Context(), spaceID, groupID, actorID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		logger.Log.Error().Str("spaceId", spaceID).Str("groupId", groupID).Err(err).Msg("remove space group error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove group from space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// SearchUnsplash handles GET /api/console/unsplash/search.
func (h *SpaceHandlers) SearchUnsplash(c *gin.Context) {
	accessKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	if accessKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "unsplash not configured"})
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if h.unsplashLimiter != nil && !h.unsplashLimiter.allow(userID) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
		return
	}

	page := c.DefaultQuery("page", "1")
	perPage := c.DefaultQuery("per_page", "20")

	u, err := url.Parse("https://api.unsplash.com/search/photos")
	if err != nil {
		logger.Log.Error().Err(err).Msg("unsplash url parse error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse unsplash url"})
		return
	}
	q := u.Query()
	q.Set("query", query)
	q.Set("page", page)
	q.Set("per_page", perPage)
	q.Set("orientation", "landscape")
	u.RawQuery = q.Encode()

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(c.Request.Context(), "GET", u.String(), nil)
	if err != nil {
		logger.Log.Error().Err(err).Msg("unsplash request creation error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create unsplash request"})
		return
	}
	req.Header.Set("Authorization", "Client-ID "+accessKey)
	req.Header.Set("Accept-Version", "v1")

	resp, err := client.Do(req)
	if err != nil {
		logger.Log.Error().Err(err).Msg("unsplash api request error")
		c.JSON(http.StatusBadGateway, gin.H{"error": "unsplash api unavailable"})
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Log.Error().Err(err).Msg("failed to close response body")
		}
	}()

	if resp.StatusCode == http.StatusTooManyRequests {
		retryAfter := resp.Header.Get("Retry-After")
		if retryAfter != "" {
			c.Header("Retry-After", retryAfter)
		}
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "unsplash rate limited"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		logger.Log.Error().Int("status", resp.StatusCode).Msg("unsplash api error")
		c.JSON(http.StatusBadGateway, gin.H{"error": "unsplash api error"})
		return
	}

	if resp.ContentLength > 0 {
		c.DataFromReader(http.StatusOK, resp.ContentLength, "application/json", resp.Body, nil)
	} else {
		c.Status(http.StatusOK)
		c.Header("Content-Type", "application/json")
		if _, err := io.Copy(c.Writer, resp.Body); err != nil {
			logger.Log.Error().Err(err).Msg("failed to stream unsplash response")
		}
	}
}

// ToggleFavorite handles POST /api/console/spaces/:id/favorite — toggles favorite status.
func (h *SpaceHandlers) ToggleFavorite(c *gin.Context) {
	if h.favRepo == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "favorites not available"})
		return
	}
	userID := middleware.GetCurrentUserID(c)
	spaceID := c.Param("id")

	if err := h.spaceService.RequireRead(c.Request.Context(), spaceID, userID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		logger.Log.Error().Err(err).Msg("space favorite permission check error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to toggle favorite"})
		return
	}

	favorited, err := h.favRepo.Toggle(c.Request.Context(), userID, spaceID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("toggle space favorite error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to toggle favorite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"favorited": favorited})
}

// IsFavorited handles GET /api/console/spaces/:id/favorited.
func (h *SpaceHandlers) IsFavorited(c *gin.Context) {
	if h.favRepo == nil {
		c.JSON(http.StatusOK, gin.H{"favorited": false})
		return
	}
	userID := middleware.GetCurrentUserID(c)
	spaceID := c.Param("id")

	if err := h.spaceService.RequireRead(c.Request.Context(), spaceID, userID); err != nil {
		if errors.Is(err, ErrSpacePermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		logger.Log.Error().Err(err).Msg("space favorite permission check error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check favorite"})
		return
	}

	isFav, err := h.favRepo.IsFavorited(c.Request.Context(), userID, spaceID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("check space favorite error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check favorite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"favorited": isFav})
}

// GetFavoritedSpaces handles GET /api/console/spaces/favorites.
func (h *SpaceHandlers) GetFavoritedSpaces(c *gin.Context) {
	if h.favRepo == nil || h.spaceService == nil {
		c.JSON(http.StatusOK, []models.Space{})
		return
	}
	userID := middleware.GetCurrentUserID(c)

	ids, err := h.favRepo.List(c.Request.Context(), userID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("list space favorites error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list favorites"})
		return
	}

	spaces, err := h.spaceService.ListReadableFavoritedSpaces(c.Request.Context(), ids, userID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("list favorited spaces error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list favorited spaces"})
		return
	}

	c.JSON(http.StatusOK, spaces)
}
