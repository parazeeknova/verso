package collab

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestPresenceStore_AddAndGet(t *testing.T) {
	ps := NewPresenceStore(200 * time.Millisecond)

	user1 := ActiveUser{
		ClientID: "client-1",
		ID:       "user-1",
		Name:     "Pikachu",
		Color:    "#ff0000",
		IsGuest:  true,
	}

	ps.UpdatePresence("page-123", user1)

	presence := ps.GetPresence("page-123")
	assert.Len(t, presence, 1)
	assert.Equal(t, "Pikachu", presence[0].Name)
	assert.True(t, presence[0].IsGuest)

	// Update presence again
	user2 := ActiveUser{
		ClientID: "client-2",
		ID:       "user-2",
		Name:     "Owner",
		Color:    "#00ff00",
		IsOwner:  true,
	}
	ps.UpdatePresence("page-123", user2)

	presence = ps.GetPresence("page-123")
	assert.Len(t, presence, 2)

	// Wait for expiry
	time.Sleep(250 * time.Millisecond)

	expiredPresence := ps.GetPresence("page-123")
	assert.Len(t, expiredPresence, 0)
}

func TestPresenceStore_RemovePresence(t *testing.T) {
	ps := NewPresenceStore(10 * time.Second)

	user1 := ActiveUser{
		ClientID: "client-1",
		ID:       "user-1",
		Name:     "Charizard",
	}

	ps.UpdatePresence("page-456", user1)
	assert.Len(t, ps.GetPresence("page-456"), 1)

	ps.RemovePresence("page-456", "client-1")
	assert.Len(t, ps.GetPresence("page-456"), 0)
}
