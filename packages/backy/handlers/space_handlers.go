package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"verso/backy/logger"
	"verso/backy/models"
	"verso/backy/services"
)

// --- Space Handlers ---

// GetSpaces handles GET /api/console/spaces.
func (h *Handlers) GetSpaces(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusOK, []models.Space{})
		return
	}

	workspaceID := c.Query("workspaceId")
	if workspaceID == "" {
		c.JSON(http.StatusOK, []models.Space{})
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

// CreateSpaceRequest is the request body for creating a space.
type CreateSpaceRequest struct {
	Name        string `json:"name" binding:"required"`
	Slug        string `json:"slug" binding:"required"`
	Icon        string `json:"icon"`
	WorkspaceID string `json:"workspaceId" binding:"required"`
}

// CreateSpace handles POST /api/console/spaces.
func (h *Handlers) CreateSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	var req CreateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	space, err := h.spaceService.CreateSpace(c.Request.Context(), req.Name, req.Slug, req.Icon, req.WorkspaceID)
	if err != nil {
		logger.Log.Error().Err(err).Msg("create space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create space"})
		return
	}

	c.JSON(http.StatusCreated, space)
}

// UpdateSpaceRequest is the request body for updating a space.
type UpdateSpaceRequest struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
	Icon string `json:"icon"`
}

// UpdateSpace handles PUT /api/console/spaces/:id.
func (h *Handlers) UpdateSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	id := c.Param("id")

	var req UpdateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	space, err := h.spaceService.UpdateSpace(c.Request.Context(), id, req.Name, req.Slug, req.Icon)
	if err != nil {
		if errors.Is(err, services.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("update space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update space"})
		return
	}

	c.JSON(http.StatusOK, space)
}

// DeleteSpace handles DELETE /api/console/spaces/:id.
func (h *Handlers) DeleteSpace(c *gin.Context) {
	if h.spaceService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "space service unavailable"})
		return
	}

	id := c.Param("id")

	if err := h.spaceService.DeleteSpace(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrSpaceNotEmpty) {
			c.JSON(http.StatusConflict, gin.H{"error": "space is not empty, remove pages first"})
			return
		}
		if errors.Is(err, services.ErrSpaceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		logger.Log.Error().Str("id", id).Err(err).Msg("delete space error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
