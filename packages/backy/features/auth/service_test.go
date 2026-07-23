package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetUserPrimaryWorkspaceIDNilRepo(t *testing.T) {
	svc := &AuthService{}
	id, err := svc.GetUserPrimaryWorkspaceID(context.Background(), "user-123")
	assert.NoError(t, err)
	assert.Equal(t, "", id)
}
