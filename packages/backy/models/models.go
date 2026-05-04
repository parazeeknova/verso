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
	ParentPageID    *string         `json:"parent_page_id,omitempty"`
	SpaceID         string          `json:"space_id"`
	CreatorID       string          `json:"creator_id"`
	LastUpdatedByID *string         `json:"last_updated_by_id,omitempty"`
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
	ParentPageID *string `json:"parentPageId,omitempty"`
	SpaceID      string  `json:"spaceId"`
	WorkspaceID  string  `json:"workspaceId"`
	HasChildren  bool    `json:"hasChildren"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

// Space represents a space grouping pages together.
type Space struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Icon        string `json:"icon"`
	WorkspaceID string `json:"workspaceId"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// Workspace represents a top-level grouping of spaces.
type Workspace struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Icon      string `json:"icon"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
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
	IsOwner   bool   `json:"is_owner"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
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
