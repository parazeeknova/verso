package models

import (
	"encoding/json"
	"time"
)

// Link represents a labeled URL link
type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

// Profile represents user profile data
type Profile struct {
	Name        string          `json:"name"`
	Tagline     string          `json:"tagline"`
	Description string          `json:"description"`
	Email       string          `json:"email,omitempty"`
	Username    string          `json:"username,omitempty"`
	Links       map[string]Link `json:"links"`
}

// ExperienceItem represents a work experience entry
type ExperienceItem struct {
	Title    string `json:"title"`
	Location string `json:"location"`
	Period   string `json:"period"`
}

// Project represents a project entry
type Project struct {
	Title      string `json:"title"`
	Desc       string `json:"desc"`
	ReadmeURL  string `json:"readmeUrl,omitempty"`
	RepoURL    string `json:"repoUrl,omitempty"`
	ProductURL string `json:"productUrl,omitempty"`
	Stack      string `json:"stack"`
}

// GitHubOrg represents a GitHub organization
type GitHubOrg struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	URL       string `json:"url"`
	HTMLURL   string `json:"html_url"`
}

// GitHubStats represents GitHub statistics
type GitHubStats struct {
	CommitsThisMonth int         `json:"commitsThisMonth"`
	CommitsLastYear  int         `json:"commitsLastYear"`
	PRsThisMonth     int         `json:"prsThisMonth"`
	Orgs             []GitHubOrg `json:"orgs"`
}

// GraphQLRequest represents a GraphQL request payload
type GraphQLRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

// GraphQLResponse represents a GraphQL response
type GraphQLResponse struct {
	Data struct {
		User *struct {
			ContributionsCollection struct {
				TotalCommitContributions      int `json:"totalCommitContributions"`
				TotalPullRequestContributions int `json:"totalPullRequestContributions"`
			} `json:"contributionsCollection"`
		} `json:"user"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// BlogPost represents a blog post response
type BlogPost struct {
	Description     string          `json:"description"`
	PublishedAt     string          `json:"publishedAt"`
	ReadTimeMinutes int             `json:"readTimeMinutes"`
	Section         string          `json:"section"`
	Slug            string          `json:"slug"`
	Tags            []string        `json:"tags"`
	Title           string          `json:"title"`
	ContentJSON     json.RawMessage `json:"content,omitempty"`
	Icon            string          `json:"icon,omitempty"`
	CoverPhoto      string          `json:"coverPhoto,omitempty"`
}

// Page represents a page stored in the database
type Page struct {
	ID              string          `json:"id"`
	SlugID          string          `json:"slug_id"`
	Title           string          `json:"title"`
	Icon            string          `json:"icon"`
	CoverPhoto      string          `json:"cover_photo"`
	ContentJSON     json.RawMessage `json:"content_json"`
	YDoc            []byte          `json:"ydoc,omitempty"`
	TextContent     string          `json:"text_content"`
	Position        string          `json:"position"`
	IsPublished     bool            `json:"is_published"`
	IsLocked        bool            `json:"is_locked"`
	ParentPageID    *string         `json:"parent_page_id,omitempty"`
	SpaceID         string          `json:"space_id"`
	WorkspaceID     string          `json:"workspace_id"`
	CreatorID       string          `json:"creator_id"`
	LastUpdatedByID *string         `json:"last_updated_by_id,omitempty"`
	DeletedAt       *time.Time      `json:"deleted_at,omitempty"`
	DeletedByID     *string         `json:"deleted_by_id,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// PageTreeItem represents a page node in the tree view.
type PageTreeItem struct {
	ID           string  `json:"id"`
	SlugID       string  `json:"slugId"`
	Title        string  `json:"title"`
	Icon         string  `json:"icon"`
	Position     string  `json:"position"`
	IsPublished  bool    `json:"isPublished"`
	IsShared     bool    `json:"isShared"`
	ParentPageID *string `json:"parentPageId,omitempty"`
	SpaceID      string  `json:"spaceId"`
	WorkspaceID  string  `json:"workspaceId"`
	CreatorID    string  `json:"creatorId"`
	HasChildren  bool    `json:"hasChildren"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

// SpaceRole constants for space membership.
const (
	SpaceRoleAdmin  = "admin"
	SpaceRoleWriter = "writer"
	SpaceRoleReader = "reader"
)

// Group represents a workspace-scoped permission bundle.
type Group struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsDefault   bool   `json:"isDefault"`
	CreatorID   string `json:"creatorId,omitempty"`
	MemberCount int    `json:"memberCount"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// GroupUser represents a user's membership in a group.
type GroupUser struct {
	ID      string `json:"id"`
	GroupID string `json:"group_id"`
	UserID  string `json:"user_id"`
	AddedAt string `json:"added_at"`
}

// GroupMemberWithUser represents a group membership enriched with user details.
type GroupMemberWithUser struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	GroupID   string `json:"group_id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	AddedAt   string `json:"added_at"`
}

// Space represents a space grouping pages together.
type Space struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	HeaderImage string `json:"headerImage"`
	WorkspaceID string `json:"workspaceId"`
	CreatedBy   string `json:"createdBy,omitempty"`
	Visibility  string `json:"visibility"`
	DefaultRole string `json:"defaultRole"`
	Settings    string `json:"settings"`
	MemberCount int    `json:"memberCount"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// SpaceMember represents a membership in a space (user or group).
type SpaceMember struct {
	ID       string `json:"id"`
	UserID   string `json:"user_id,omitempty"`
	GroupID  string `json:"group_id,omitempty"`
	SpaceID  string `json:"space_id"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}

// SpaceMemberWithUser represents a space membership enriched with user details.
type SpaceMemberWithUser struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	SpaceID   string `json:"space_id"`
	Role      string `json:"role"`
	JoinedAt  string `json:"joined_at"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

// SpaceMemberMixed represents a space membership that may be a user or a group.
type SpaceMemberMixed struct {
	MemberType  string  `json:"memberType"`
	ID          string  `json:"id"`
	UserID      *string `json:"userId,omitempty"`
	GroupID     *string `json:"groupId,omitempty"`
	SpaceID     string  `json:"spaceId"`
	Role        string  `json:"role"`
	JoinedAt    string  `json:"joinedAt"`
	Name        string  `json:"name"`
	Email       *string `json:"email,omitempty"`
	AvatarURL   *string `json:"avatarUrl,omitempty"`
	Description *string `json:"description,omitempty"`
	MemberCount int     `json:"memberCount,omitempty"`
	IsDefault   *bool   `json:"isDefault,omitempty"`
}

// Workspace represents a top-level grouping of spaces.
type Workspace struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Slug           string `json:"slug"`
	Icon           string `json:"icon"`
	Description    string `json:"description"`
	Settings       string `json:"settings"`
	DefaultSpaceID string `json:"defaultSpaceId,omitempty"`
	EnforceMFA     bool   `json:"enforce_mfa"`
	MemberCount    int    `json:"memberCount"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

// WorkspaceMember represents a user's membership in a workspace.
type WorkspaceMember struct {
	ID          string `json:"id"`
	UserID      string `json:"user_id"`
	WorkspaceID string `json:"workspace_id"`
	Role        string `json:"role"`
	JoinedAt    string `json:"joined_at"`
}

// UserMFA represents a user's MFA configuration.
type UserMFA struct {
	ID               string   `json:"id"`
	UserID           string   `json:"user_id"`
	WorkspaceID      string   `json:"workspace_id"`
	Method           string   `json:"method"`
	Secret           string   `json:"secret"`
	IsEnabled        bool     `json:"is_enabled"`
	BackupCodeHashes []string `json:"backup_code_hashes"`
	CreatedAt        string   `json:"created_at"`
	UpdatedAt        string   `json:"updated_at"`
}

// PageHistory represents a page history entry
type PageHistory struct {
	ID          string          `json:"id"`
	PageID      string          `json:"page_id"`
	Title       string          `json:"title"`
	ContentJSON json.RawMessage `json:"content_json"`
	YDoc        []byte          `json:"ydoc,omitempty"`
	TextContent string          `json:"text_content"`
	Operation   string          `json:"operation"`
	CreatedByID string          `json:"created_by_id"`
	CreatedAt   time.Time       `json:"created_at"`
}

// BlogManifestEntry represents a single entry in the blog manifest
type BlogManifestEntry struct {
	Slug    string `json:"slug"`
	Title   string `json:"title"`
	Section string `json:"section"`
}

// BlogManifestSection represents a section of the blog manifest
type BlogManifestSection struct {
	Label    string              `json:"label"`
	Children []BlogManifestEntry `json:"children"`
}

// AuthUser is a database row from the users table.
type AuthUser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ConsoleUser is a sanitized user object for console member management.
type ConsoleUser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	LastSeen  string `json:"last_seen"`
	CreatedAt string `json:"created_at"`
}

// AuthSession is a database row from the sessions table.
type AuthSession struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	DeviceName string `json:"device_name"`
	ExpiresAt  string `json:"expires_at"`
	LastSeenAt string `json:"last_seen_at"`
	CreatedAt  string `json:"created_at"`
}

// AuthRefreshToken is a database row from the refresh_tokens table.
type AuthRefreshToken struct {
	ID        string `json:"id"`
	SessionID string `json:"session_id"`
	TokenHash string `json:"token_hash"`
	ExpiresAt string `json:"expires_at"`
	CreatedAt string `json:"created_at"`
	RotatedAt string `json:"rotated_at,omitempty"`
	RevokedAt string `json:"revoked_at,omitempty"`
}

// Notification represents a persistent in-app notification row.
type Notification struct {
	ID              string     `json:"id"`
	WorkspaceID     *string    `json:"workspaceId,omitempty"`
	RecipientUserID string     `json:"recipientUserId"`
	ActorUserID     *string    `json:"actorUserId,omitempty"`
	Type            string     `json:"type"`
	Title           string     `json:"title"`
	Body            string     `json:"body"`
	EntityType      string     `json:"entityType"`
	EntityID        string     `json:"entityId"`
	Metadata        string     `json:"metadata"`
	ReadAt          *time.Time `json:"readAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// PageWatcher represents a user watching a page.
type PageWatcher struct {
	PageID    string    `json:"pageId"`
	UserID    string    `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

// NotificationWithActor is a notification enriched with actor user details for display.
type NotificationWithActor struct {
	ID              string     `json:"id"`
	WorkspaceID     *string    `json:"workspaceId,omitempty"`
	RecipientUserID string     `json:"recipientUserId"`
	ActorUserID     *string    `json:"actorUserId,omitempty"`
	Type            string     `json:"type"`
	Title           string     `json:"title"`
	Body            string     `json:"body"`
	EntityType      string     `json:"entityType"`
	EntityID        string     `json:"entityId"`
	Metadata        string     `json:"metadata"`
	ReadAt          *time.Time `json:"readAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	ActorName       string     `json:"actorName,omitempty"`
	ActorAvatarURL  string     `json:"actorAvatarUrl,omitempty"`
}

// PushSubscription represents a browser push notification subscription.
type PushSubscription struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Endpoint  string    `json:"endpoint"`
	P256DH    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	UserAgent string    `json:"userAgent"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PageShare represents a public share setting for a page.
type PageShare struct {
	ID             string    `json:"id"`
	PageID         string    `json:"pageId"`
	ShareToken     string    `json:"shareToken"`
	ShortCode      *string   `json:"shortCode,omitempty"`
	SearchIndexing bool      `json:"searchIndexing"`
	IsEnabled      bool      `json:"isEnabled"`
	AccessLevel    string    `json:"accessLevel"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}
