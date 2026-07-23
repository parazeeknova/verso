package collab

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	yws "github.com/reearth/ygo/provider/websocket"

	notifeat "verso/backy/features/notification"
	"verso/backy/repositories"
	"verso/backy/shared/auth"
	"verso/backy/shared/logger"
)

// CollabService wraps the ygo Yjs WebSocket server and manages page collaboration permissions.
type CollabService struct {
	server        *yws.Server
	pageRepo      *repositories.PageRepo
	spaceRepo     *repositories.SpaceRepo
	pageShareRepo *repositories.PageShareRepo
	groupRepo     *repositories.GroupRepo
	workspaceRepo *repositories.WorkspaceRepo
	notifier      *notifeat.NotificationService
	presenceStore *PresenceStore
}

// NewCollabService creates and configures a new Yjs collaboration service.
func NewCollabService(
	pool *pgxpool.Pool,
	pageRepo *repositories.PageRepo,
	spaceRepo *repositories.SpaceRepo,
	pageShareRepo *repositories.PageShareRepo,
	groupRepo *repositories.GroupRepo,
	workspaceRepo *repositories.WorkspaceRepo,
) *CollabService {
	persistence := NewPagePersistence(pool)
	server := yws.NewServerWithPersistence(persistence)

	// Allow all origins for WebSocket upgrades (handled via CORS and token auth)
	server.AllowedOrigins = []string{"*"}

	cs := &CollabService{
		server:        server,
		pageRepo:      pageRepo,
		spaceRepo:     spaceRepo,
		pageShareRepo: pageShareRepo,
		groupRepo:     groupRepo,
		workspaceRepo: workspaceRepo,
		presenceStore: NewPresenceStore(12 * time.Second),
	}

	// Attach custom Authorize hook
	server.Authorize = cs.Authorize

	return cs
}

// SetNotifier sets the notification service for broadcasting real-time tree/sidebar events.
func (cs *CollabService) SetNotifier(notifier *notifeat.NotificationService) {
	cs.notifier = notifier
}

// GetServer returns the underlying yws.Server.
func (cs *CollabService) GetServer() *yws.Server {
	return cs.server
}

// Authorize checks user authentication and page access level permissions.
// Returns yws.ConnectionConfig and boolean (accepted vs 401 rejected).
func (cs *CollabService) Authorize(r *http.Request) (yws.ConnectionConfig, bool) {
	// Extract room name from query parameters or path
	room := r.URL.Query().Get("room")
	if room == "" {
		room = r.URL.Query().Get("doc")
	}
	if room == "" {
		room = r.URL.Query().Get("documentName")
	}
	if room == "" {
		// Fallback to path element e.g. /ws/collab/page.<id>
		parts := strings.Split(r.URL.Path, "/")
		for i := len(parts) - 1; i >= 0; i-- {
			p := parts[i]
			if strings.HasPrefix(p, "page.") || len(extractPageID(p)) > 0 {
				room = p
				break
			}
		}
	}

	pageID := extractPageID(room)
	if pageID == "" {
		pageID = extractPageID(r.URL.Path)
	}
	if pageID == "" {
		logger.Log.Warn().Str("room", room).Str("path", r.URL.Path).Msg("collab auth: missing or invalid room/pageID")
		return yws.ConnectionConfig{}, false
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Fetch target page
	page, err := cs.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		logger.Log.Warn().Err(err).Str("page_id", pageID).Msg("collab auth: page not found")
		return yws.ConnectionConfig{}, false
	}

	// Extract token from query param or Authorization header
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// Validate token if present
	var userID string
	var userWorkspaceID string
	if tokenStr != "" {
		collabClaims, err := auth.ValidateCollabToken(tokenStr)
		if err == nil && collabClaims != nil {
			userID = collabClaims.UserID
			userWorkspaceID = collabClaims.WorkspaceID
		} else {
			// Fallback: check standard access token
			accessClaims, err := auth.ValidateAccessToken(tokenStr)
			if err == nil && accessClaims != nil {
				userID = accessClaims.UserID
			}
		}
	}

	// Base readOnly decision: page lock forces readOnly
	res := cs.resolvePageAccess(ctx, page, userID, userWorkspaceID)
	if res.Granted {
		logger.Log.Debug().Str("user_id", userID).Str("page_id", pageID).Bool("read_only", res.ReadOnly).Msg("collab auth granted")
		return yws.ConnectionConfig{ReadOnly: res.ReadOnly}, true
	}

	logger.Log.Warn().Str("user_id", userID).Str("page_id", pageID).Msg("collab auth denied")
	return yws.ConnectionConfig{}, false
}

// ServeWS handles WebSocket upgrade requests from Gin.
func (cs *CollabService) ServeWS(c *gin.Context) {
	cs.server.ServeHTTP(c.Writer, c.Request)
}
