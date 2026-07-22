package collab

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	yws "github.com/reearth/ygo/provider/websocket"

	"verso/backy/database/models"
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
	notifier      *notifeat.NotificationService
}

// NewCollabService creates and configures a new Yjs collaboration service.
func NewCollabService(
	pool *pgxpool.Pool,
	pageRepo *repositories.PageRepo,
	spaceRepo *repositories.SpaceRepo,
	pageShareRepo *repositories.PageShareRepo,
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
	if tokenStr != "" {
		collabClaims, err := auth.ValidateCollabToken(tokenStr)
		if err == nil && collabClaims != nil {
			userID = collabClaims.UserID
		} else {
			// Fallback: check standard access token
			accessClaims, err := auth.ValidateAccessToken(tokenStr)
			if err == nil && accessClaims != nil {
				userID = accessClaims.UserID
			}
		}
	}

	// Base readOnly decision: page lock forces readOnly
	readOnly := page.IsLocked

	// Check permissions based on authentication state
	if userID != "" {
		// 1. Space Level Access: check user's role in the page's space
		effectiveRole, err := cs.spaceRepo.GetEffectiveRole(ctx, page.SpaceID, userID, nil)
		if err == nil && effectiveRole != "" {
			if effectiveRole == models.SpaceRoleReader {
				readOnly = true
			}
			// Member of space: allowed
			logger.Log.Debug().Str("user_id", userID).Str("page_id", pageID).Bool("read_only", readOnly).Msg("collab auth granted (space member)")
			return yws.ConnectionConfig{ReadOnly: readOnly}, true
		}

		// 2. App Level Access: check space visibility and default role
		space, spaceErr := cs.spaceRepo.GetByID(ctx, page.SpaceID)
		if spaceErr == nil {
			if space.Visibility == "public" || space.Visibility == "workspace" {
				if space.DefaultRole == models.SpaceRoleReader {
					readOnly = true
				}
				logger.Log.Debug().Str("user_id", userID).Str("page_id", pageID).Bool("read_only", readOnly).Msg("collab auth granted (app level / space visibility)")
				return yws.ConnectionConfig{ReadOnly: readOnly}, true
			}
		}

		// Check if page has public share enabled
		share, shareErr := cs.pageShareRepo.GetByPageID(ctx, pageID)
		if shareErr == nil && share.IsEnabled {
			if share.AccessLevel == "edit" || share.AccessLevel == "public_edit" {
				if !page.IsLocked {
					readOnly = false
				}
			} else {
				readOnly = true
			}
			logger.Log.Debug().Str("user_id", userID).Str("page_id", pageID).Str("access_level", share.AccessLevel).Bool("read_only", readOnly).Msg("collab auth granted (page shared)")
			return yws.ConnectionConfig{ReadOnly: readOnly}, true
		}

		logger.Log.Warn().Str("user_id", userID).Str("page_id", pageID).Msg("collab auth denied: user lacks access to space")
		return yws.ConnectionConfig{}, false
	}

	// 3. Anonymous / Public Access
	share, shareErr := cs.pageShareRepo.GetByPageID(ctx, pageID)
	if shareErr == nil && share.IsEnabled {
		if share.AccessLevel == "public_edit" && !page.IsLocked {
			readOnly = false
		} else {
			readOnly = true
		}
		logger.Log.Debug().Str("page_id", pageID).Str("access_level", share.AccessLevel).Bool("read_only", readOnly).Msg("collab auth granted (anonymous on public share)")
		return yws.ConnectionConfig{ReadOnly: readOnly}, true
	}

	logger.Log.Warn().Str("page_id", pageID).Msg("collab auth denied: anonymous user on unshared page")
	return yws.ConnectionConfig{}, false
}

// ServeWS handles WebSocket upgrade requests from Gin.
func (cs *CollabService) ServeWS(c *gin.Context) {
	cs.server.ServeHTTP(c.Writer, c.Request)
}
