package comment

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/middleware"
	"verso/backy/shared/logger"
)

type CommentHandlers struct {
	commentService *CommentService
	hub            *CommentHub
	rateLimiter    *GuestCommentRateLimiter
}

func NewCommentHandlers(commentService *CommentService, hub *CommentHub) *CommentHandlers {
	return &CommentHandlers{
		commentService: commentService,
		hub:            hub,
		rateLimiter:    NewGuestCommentRateLimiter(),
	}
}

func (h *CommentHandlers) RegisterRoutes(rg *gin.RouterGroup) {
	// Page-scoped comment endpoints
	pagesGroup := rg.Group("/pages/:id/comments")
	{
		pagesGroup.POST("", h.CreateComment)
		pagesGroup.GET("", h.ListComments)
		pagesGroup.GET("/stream", h.StreamComments)
	}

	// Comment-scoped endpoints
	commentsGroup := rg.Group("/comments")
	{
		commentsGroup.GET("/:commentId", h.GetComment)
		commentsGroup.PATCH("/:commentId", h.UpdateComment)
		commentsGroup.DELETE("/:commentId", h.DeleteComment)
		commentsGroup.POST("/:commentId/resolve", h.ToggleResolve)
	}
}

func (h *CommentHandlers) CreateComment(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page ID is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		if !h.commentService.IsPageShared(c.Request.Context(), pageID) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}
		userID = "guest"
	}

	if userID == "guest" && h.rateLimiter != nil {
		clientIP := c.ClientIP()
		if allowed, msg := h.rateLimiter.Allow(clientIP); !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": msg})
			return
		}
	}

	var input CreateCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	trimmedContent := input.Content
	if len(trimmedContent) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment content cannot exceed 2000 characters"})
		return
	}

	if trimmedContent == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	created, err := h.commentService.CreateComment(c.Request.Context(), pageID, userID, input)
	if err != nil {
		if errors.Is(err, ErrInvalidParent) || errors.Is(err, ErrReplyToReply) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		logger.Log.Error().Err(err).Str("page_id", pageID).Str("user_id", userID).Msg("create comment error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create comment"})
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *CommentHandlers) ListComments(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page ID is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if userID == "" && !h.commentService.IsPageShared(c.Request.Context(), pageID) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	comments, err := h.commentService.ListComments(c.Request.Context(), pageID)
	if err != nil {
		logger.Log.Error().Err(err).Str("page_id", pageID).Msg("list comments error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list comments"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

func (h *CommentHandlers) GetComment(c *gin.Context) {
	commentID := c.Param("commentId")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment ID is required"})
		return
	}

	comment, err := h.commentService.GetComment(c.Request.Context(), commentID)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		logger.Log.Error().Err(err).Str("comment_id", commentID).Msg("get comment error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get comment"})
		return
	}

	c.JSON(http.StatusOK, comment)
}

func (h *CommentHandlers) UpdateComment(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	commentID := c.Param("commentId")
	var input UpdateCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updated, err := h.commentService.UpdateComment(c.Request.Context(), commentID, userID, input)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, ErrCommentResolved) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "resolved comments cannot be edited"})
			return
		}
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only edit your own comments"})
			return
		}
		logger.Log.Error().Err(err).Str("comment_id", commentID).Msg("update comment error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update comment"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *CommentHandlers) DeleteComment(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	commentID := c.Param("commentId")
	userRole := middleware.GetCurrentUserRole(c)
	isAdmin := userRole == "admin" || userRole == "owner"

	err := h.commentService.DeleteComment(c.Request.Context(), commentID, userID, isAdmin)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own comments"})
			return
		}
		logger.Log.Error().Err(err).Str("comment_id", commentID).Msg("delete comment error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *CommentHandlers) ToggleResolve(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	commentID := c.Param("commentId")
	var input ResolveCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updated, err := h.commentService.ToggleResolve(c.Request.Context(), commentID, userID, input)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
			return
		}
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "only page owner can resolve comments"})
			return
		}
		logger.Log.Error().Err(err).Str("comment_id", commentID).Msg("resolve comment error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve comment"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *CommentHandlers) StreamComments(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page ID is required"})
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if userID == "" && !h.commentService.IsPageShared(c.Request.Context(), pageID) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	if h.hub == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "comments stream not available"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.Writer.WriteHeader(http.StatusOK)
	flusher, _ := c.Writer.(http.Flusher)
	if flusher != nil {
		flusher.Flush()
	}

	ch := make(chan string, 32)
	unsub := h.hub.Subscribe(pageID, ch)
	defer unsub()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	ctx := c.Request.Context()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			_, _ = fmt.Fprintf(c.Writer, "data: %s\n\n", msg)
			if flusher != nil {
				flusher.Flush()
			}
		case <-heartbeat.C:
			if _, err := fmt.Fprintf(c.Writer, ": ping\n\n"); err != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
		case <-ctx.Done():
			return
		}
	}
}
