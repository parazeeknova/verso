package comment

import (
	"encoding/json"
	"sync"

	"verso/backy/database/models"
)

// CommentEvent represents a real-time event for comments.
type CommentEvent struct {
	Operation string                     `json:"operation"` // commentCreated, commentUpdated, commentDeleted, commentResolved
	PageID    string                     `json:"pageId"`
	CommentID string                     `json:"commentId,omitempty"`
	Comment   *models.CommentWithDetails `json:"comment,omitempty"`
}

// CommentHub handles real-time subscriptions per page ID.
type CommentHub struct {
	mu   sync.RWMutex
	subs map[string]map[chan string]struct{} // pageID -> set of channels
}

// NewCommentHub creates a new comment hub.
func NewCommentHub() *CommentHub {
	return &CommentHub{
		subs: make(map[string]map[chan string]struct{}),
	}
}

// Subscribe registers a channel for updates on a page ID. Returns an unsubscribe function.
func (h *CommentHub) Subscribe(pageID string, ch chan string) func() {
	h.mu.Lock()
	if h.subs[pageID] == nil {
		h.subs[pageID] = make(map[chan string]struct{})
	}
	h.subs[pageID][ch] = struct{}{}
	h.mu.Unlock()

	return func() {
		h.mu.Lock()
		delete(h.subs[pageID], ch)
		if len(h.subs[pageID]) == 0 {
			delete(h.subs, pageID)
		}
		h.mu.Unlock()
	}
}

// Publish broadcasts a CommentEvent to all clients listening to a specific page.
func (h *CommentHub) Publish(pageID string, event CommentEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	msg := string(data)

	h.mu.RLock()
	channels := h.subs[pageID]
	h.mu.RUnlock()

	for ch := range channels {
		select {
		case ch <- msg:
		default:
			// Drop if channel buffer is full
		}
	}
}
