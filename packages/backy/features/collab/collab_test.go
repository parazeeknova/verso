package collab

import (
	"net/http"
	"net/url"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"verso/backy/shared/auth"
)

func TestMain(m *testing.M) {
	_ = os.Setenv("JWT_ACCESS_TOKEN_SECRET", "test-secret-at-least-32-bytes-long-for-verso-collaboration-testing")
	os.Exit(m.Run())
}

func TestCollabTokenClaims(t *testing.T) {
	userID := uuid.New()
	workspaceID := uuid.New().String()

	tokenStr, err := auth.GenerateCollabToken(userID, workspaceID)
	require.NoError(t, err)
	assert.NotEmpty(t, tokenStr)

	claims, err := auth.ValidateCollabToken(tokenStr)
	require.NoError(t, err)
	require.NotNil(t, claims)

	assert.Equal(t, userID.String(), claims.UserID)
	assert.Equal(t, workspaceID, claims.WorkspaceID)
	assert.Equal(t, "collab", claims.Type)
}

func TestExtractPageID(t *testing.T) {
	testUUID := uuid.New().String()
	assert.Equal(t, testUUID, extractPageID("page."+testUUID))
	assert.Equal(t, testUUID, extractPageID(testUUID))
	assert.Equal(t, testUUID, extractPageID("/ws/collab/page."+testUUID))
	assert.Equal(t, "", extractPageID(""))
	assert.Equal(t, "", extractPageID("invalid-non-uuid"))
	assert.Equal(t, "", extractPageID("collab"))
}

func TestAuthorizeTokenExtraction(t *testing.T) {
	userID := uuid.New()
	workspaceID := uuid.New().String()
	pageUUID := uuid.New().String()

	tokenStr, err := auth.GenerateCollabToken(userID, workspaceID)
	require.NoError(t, err)

	u, err := url.Parse("/ws/collab?room=page." + pageUUID + "&token=" + tokenStr)
	require.NoError(t, err)

	req := &http.Request{
		Method: "GET",
		URL:    u,
		Header: make(http.Header),
	}

	room := req.URL.Query().Get("room")
	assert.Equal(t, "page."+pageUUID, room)

	pageID := extractPageID(room)
	assert.Equal(t, pageUUID, pageID)

	extractedToken := req.URL.Query().Get("token")
	claims, err := auth.ValidateCollabToken(extractedToken)
	require.NoError(t, err)
	assert.Equal(t, userID.String(), claims.UserID)
}

func TestPagePersistenceNilGuard(t *testing.T) {
	var p *PagePersistence
	doc, err := p.LoadDoc("page.123")
	assert.NoError(t, err)
	assert.Nil(t, doc)

	err = p.StoreUpdate("page.123", []byte("test"))
	assert.NoError(t, err)
}
