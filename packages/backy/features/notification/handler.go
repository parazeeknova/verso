package notification

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/middleware"
	"verso/backy/shared/logger"
)

// NotificationHandlers holds HTTP handlers for notification endpoints.
type NotificationHandlers struct {
	notificationService *NotificationService
	hub                 *NotificationHub
}

// NewNotificationHandlers creates a new NotificationHandlers.
func NewNotificationHandlers(notificationService *NotificationService, hub *NotificationHub) *NotificationHandlers {
	return &NotificationHandlers{notificationService: notificationService, hub: hub}
}

// RegisterRoutes registers all notification routes on the given router group.
func (h *NotificationHandlers) RegisterRoutes(rg *gin.RouterGroup) {
	notifGroup := rg.Group("/notifications")
	{
		notifGroup.GET("", h.ListNotifications)
		notifGroup.GET("/unread-count", h.UnreadCount)
		notifGroup.GET("/stream", h.Stream)
		notifGroup.PUT("/read-all", h.MarkAllRead)
		notifGroup.PUT("/:id/read", h.MarkRead)
		notifGroup.DELETE("/dismiss-all", h.DismissAllNotifications)
		notifGroup.DELETE("/:id", h.DismissNotification)
	}
}

// ListNotifications returns recent notifications for the current user.
func (h *NotificationHandlers) ListNotifications(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	notifs, err := h.notificationService.GetNotifications(c.Request.Context(), userID, 50)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID).Msg("list notifications error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list notifications"})
		return
	}

	c.JSON(http.StatusOK, notifs)
}

// UnreadCount returns the count of unread notifications.
func (h *NotificationHandlers) UnreadCount(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	count, err := h.notificationService.CountUnread(c.Request.Context(), userID)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID).Msg("unread count error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get unread count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// MarkRead marks a single notification as read.
func (h *NotificationHandlers) MarkRead(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	id := c.Param("id")
	if err := h.notificationService.MarkRead(c.Request.Context(), id, userID); err != nil {
		logger.Log.Error().Err(err).Str("id", id).Msg("mark read error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark notification as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// MarkAllRead marks all notifications as read for the current user.
func (h *NotificationHandlers) MarkAllRead(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	count, err := h.notificationService.MarkAllRead(c.Request.Context(), userID)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID).Msg("mark all read error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// DismissNotification soft-deletes a single notification.
func (h *NotificationHandlers) DismissNotification(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	id := c.Param("id")
	if err := h.notificationService.Dismiss(c.Request.Context(), id, userID); err != nil {
		logger.Log.Error().Err(err).Str("id", id).Msg("dismiss notification error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to dismiss notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Stream opens an SSE connection for real-time notification delivery.
func (h *NotificationHandlers) Stream(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	if h.hub == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "notifications stream not available"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// Flush headers immediately so the proxy/client doesn't time out
	// waiting for the first body chunk.
	c.Writer.WriteHeader(http.StatusOK)
	flusher, _ := c.Writer.(http.Flusher)
	if flusher != nil {
		flusher.Flush()
	}

	ch := make(chan string, 32)
	unsub := h.hub.Subscribe(userID, ch)
	defer unsub()

	// Heartbeat keeps the connection alive. Without it, idle SSE streams
	// get killed by idle timeouts (e.g. undici's 300s bodyTimeout on the
	// proxy) or intermediary proxies, forcing clients to reconnect.
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
			// SSE comment line; ignored by clients but resets idle timers.
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

// DismissAllNotifications soft-deletes all notifications for the current user.
func (h *NotificationHandlers) DismissAllNotifications(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	count, err := h.notificationService.DismissAll(c.Request.Context(), userID)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID).Msg("dismiss all notifications error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to dismiss notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}
