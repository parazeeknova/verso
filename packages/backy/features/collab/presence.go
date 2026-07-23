package collab

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/middleware"
	"verso/backy/shared/auth"
)

// ActiveUser represents a member or guest currently active on a page.
type ActiveUser struct {
	ClientID  string    `json:"clientId"`
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatar_url"`
	Color     string    `json:"color"`
	IsGuest   bool      `json:"isGuest"`
	IsOwner   bool      `json:"isOwner"`
	LastSeen  time.Time `json:"lastSeen"`
}

// PresenceStore manages active user presence per page in memory.
type PresenceStore struct {
	mu     sync.RWMutex
	pages  map[string]map[string]*ActiveUser // pageID -> (clientID -> ActiveUser)
	expiry time.Duration
	stopCh chan struct{}
	once   sync.Once
}

// NewPresenceStore creates a thread-safe presence store with automatic idle expiry.
func NewPresenceStore(expiry time.Duration) *PresenceStore {
	if expiry <= 0 {
		expiry = 12 * time.Second
	}
	ps := &PresenceStore{
		pages:  make(map[string]map[string]*ActiveUser),
		expiry: expiry,
		stopCh: make(chan struct{}),
	}
	go ps.cleanupLoop()
	return ps
}

// Stop terminates the background cleanup loop goroutine.
func (ps *PresenceStore) Stop() {
	ps.once.Do(func() {
		close(ps.stopCh)
	})
}

func (ps *PresenceStore) UpdatePresence(pageID string, user ActiveUser) {
	if pageID == "" || user.ClientID == "" {
		return
	}
	ps.mu.Lock()
	defer ps.mu.Unlock()

	user.LastSeen = time.Now()
	if ps.pages[pageID] == nil {
		ps.pages[pageID] = make(map[string]*ActiveUser)
	}
	ps.pages[pageID][user.ClientID] = &user
}

func (ps *PresenceStore) GetPresence(pageID string) []ActiveUser {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	now := time.Now()
	clientMap, ok := ps.pages[pageID]
	if !ok {
		return []ActiveUser{}
	}

	result := make([]ActiveUser, 0, len(clientMap))
	for _, user := range clientMap {
		if now.Sub(user.LastSeen) <= ps.expiry {
			result = append(result, *user)
		}
	}
	return result
}

func (ps *PresenceStore) RemovePresence(pageID, clientID string) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if clientMap, ok := ps.pages[pageID]; ok {
		delete(clientMap, clientID)
		if len(clientMap) == 0 {
			delete(ps.pages, pageID)
		}
	}
}

func (ps *PresenceStore) cleanupLoop() {
	ticker := time.NewTicker(4 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ps.stopCh:
			return
		case <-ticker.C:
			ps.mu.Lock()
			now := time.Now()
			for pageID, clientMap := range ps.pages {
				for clientID, user := range clientMap {
					if now.Sub(user.LastSeen) > ps.expiry {
						delete(clientMap, clientID)
					}
				}
				if len(clientMap) == 0 {
					delete(ps.pages, pageID)
				}
			}
			ps.mu.Unlock()
		}
	}
}

// GetPresenceStore returns the CollabService presence store.
func (cs *CollabService) GetPresenceStore() *PresenceStore {
	return cs.presenceStore
}

// HandleHeartbeatPresence handles POST /api/pages/:id/presence and /api/console/pages/:id/presence
func (cs *CollabService) HandleHeartbeatPresence(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page id required"})
		return
	}

	var req ActiveUser
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid active user presence payload"})
		return
	}

	if req.ClientID == "" {
		req.ClientID = req.ID
	}
	if req.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clientId or id required"})
		return
	}

	// Verify permission or share access
	if !cs.canAccessPagePresence(c, pageID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "presence access denied"})
		return
	}

	cs.presenceStore.UpdatePresence(pageID, req)

	collaborators := cs.presenceStore.GetPresence(pageID)
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"collaborators": collaborators,
	})
}

// HandleGetPresence handles GET /api/pages/:id/presence and /api/console/pages/:id/presence
func (cs *CollabService) HandleGetPresence(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page id required"})
		return
	}

	if !cs.canAccessPagePresence(c, pageID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "presence access denied"})
		return
	}

	collaborators := cs.presenceStore.GetPresence(pageID)
	c.JSON(http.StatusOK, gin.H{
		"collaborators": collaborators,
	})
}

// HandleShareHeartbeatPresence handles POST /api/shares/:token/presence
func (cs *CollabService) HandleShareHeartbeatPresence(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "share token required"})
		return
	}

	ctx := c.Request.Context()
	share, err := cs.pageShareRepo.GetByShareToken(ctx, token)
	if err != nil || !share.IsEnabled {
		c.JSON(http.StatusNotFound, gin.H{"error": "shared page not found or disabled"})
		return
	}

	var req ActiveUser
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid presence payload"})
		return
	}

	if req.ClientID == "" {
		req.ClientID = req.ID
	}
	if req.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clientId or id required"})
		return
	}

	cs.presenceStore.UpdatePresence(share.PageID, req)

	collaborators := cs.presenceStore.GetPresence(share.PageID)
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"collaborators": collaborators,
	})
}

// HandleShareGetPresence handles GET /api/shares/:token/presence
func (cs *CollabService) HandleShareGetPresence(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "share token required"})
		return
	}

	ctx := c.Request.Context()
	share, err := cs.pageShareRepo.GetByShareToken(ctx, token)
	if err != nil || !share.IsEnabled {
		c.JSON(http.StatusNotFound, gin.H{"error": "shared page not found or disabled"})
		return
	}

	collaborators := cs.presenceStore.GetPresence(share.PageID)
	c.JSON(http.StatusOK, gin.H{
		"collaborators": collaborators,
	})
}

// HandleLeavePresence handles DELETE/POST /api/pages/:id/presence/leave and /api/shares/:token/presence/leave
func (cs *CollabService) HandleLeavePresence(c *gin.Context) {
	pageID := c.Param("id")
	token := c.Param("token")
	if pageID == "" && token != "" {
		share, err := cs.pageShareRepo.GetByShareToken(c.Request.Context(), token)
		if err == nil && share.IsEnabled {
			pageID = share.PageID
		}
	}

	clientID := c.Query("clientId")
	if clientID == "" {
		var body struct {
			ClientID string `json:"clientId"`
		}
		_ = c.ShouldBindJSON(&body)
		clientID = body.ClientID
	}

	if pageID == "" || clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pageId and clientId required"})
		return
	}

	if !cs.canAccessPagePresence(c, pageID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "presence access denied"})
		return
	}

	cs.presenceStore.RemovePresence(pageID, clientID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// canAccessPagePresence checks if current request can access page presence.
func (cs *CollabService) canAccessPagePresence(c *gin.Context, pageID string) bool {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	page, err := cs.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return false
	}

	authHeader := c.GetHeader("Authorization")
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == "" {
		tokenStr = c.Query("token")
	}

	var userID string
	var userWorkspaceID string
	if tokenStr != "" {
		if claims, err := auth.ValidateCollabToken(tokenStr); err == nil && claims != nil {
			userID = claims.UserID
			userWorkspaceID = claims.WorkspaceID
		} else if claims, err := auth.ValidateAccessToken(tokenStr); err == nil && claims != nil {
			userID = claims.UserID
		}
	}
	if userID == "" {
		if uid := c.GetString(middleware.ContextKeyUserID); uid != "" {
			userID = uid
		}
	}

	if userID != "" {
		space, spaceErr := cs.spaceRepo.GetByID(ctx, page.SpaceID)

		// 1. Space level access
		var userGroupIDs []string
		if spaceErr == nil && cs.groupRepo != nil {
			userGroupIDs, _ = cs.groupRepo.ListUserGroupIDsInWorkspace(ctx, userID, space.WorkspaceID)
		}
		effectiveRole, err := cs.spaceRepo.GetEffectiveRole(ctx, page.SpaceID, userID, userGroupIDs)
		if err == nil && effectiveRole != "" {
			return true
		}

		// 2. Space visibility
		if spaceErr == nil {
			if space.Visibility == "public" {
				return true
			}
			if space.Visibility == "workspace" {
				if userWorkspaceID != "" && userWorkspaceID == space.WorkspaceID {
					return true
				}
				if cs.workspaceRepo != nil {
					if isMember, _ := cs.workspaceRepo.IsMember(ctx, space.WorkspaceID, userID); isMember {
						return true
					}
				}
			}
		}

		// 3. Page share enabled
		share, err := cs.pageShareRepo.GetByPageID(ctx, pageID)
		if err == nil && share.IsEnabled {
			return true
		}

		return false
	}

	// Unauthenticated: allow only if public page share is enabled
	share, err := cs.pageShareRepo.GetByPageID(ctx, pageID)
	if err == nil && share.IsEnabled {
		return true
	}

	return false
}
