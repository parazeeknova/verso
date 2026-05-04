package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"verso/backy/database"
	"verso/backy/fractional"
	"verso/backy/models"
	"verso/backy/repositories"
)

// PageService provides business logic over page and page history repositories
type PageService struct {
	pageRepo        *repositories.PageRepo
	pageHistoryRepo *repositories.PageHistoryRepo
}

// NewPageService creates a new page service
func NewPageService(pageRepo *repositories.PageRepo, pageHistoryRepo *repositories.PageHistoryRepo) *PageService {
	return &PageService{
		pageRepo:        pageRepo,
		pageHistoryRepo: pageHistoryRepo,
	}
}

// UpdatePageInput holds the fields that can be updated on a page.
type UpdatePageInput struct {
	Title       *string          `json:"title"`
	Icon        *string          `json:"icon"`
	CoverPhoto  *string          `json:"coverPhoto"`
	ContentJSON *json.RawMessage `json:"contentJson"`
	TextContent *string          `json:"textContent"`
}

// GetBlogPost retrieves a published page by slug and converts it to a BlogPost response
func (s *PageService) GetBlogPost(ctx context.Context, slug string) (models.BlogPost, error) {
	page, err := s.pageRepo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.BlogPost{}, ErrBlogPostNotFound
		}
		return models.BlogPost{}, fmt.Errorf("getting blog post %q: %w", slug, err)
	}

	return s.pageToBlogPost(page), nil
}

// GetBlogManifest returns all published pages as a blog manifest
func (s *PageService) GetBlogManifest(ctx context.Context) ([]models.BlogManifestSection, error) {
	pages, err := s.pageRepo.ListPublished(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing pages for manifest: %w", err)
	}

	sections := make(map[string][]models.BlogManifestEntry)
	for _, page := range pages {
		section := extractSection(page.SlugID)
		entry := models.BlogManifestEntry{
			Slug:    page.SlugID,
			Title:   page.Title,
			Section: section,
		}
		sections[section] = append(sections[section], entry)
	}

	result := make([]models.BlogManifestSection, 0, len(sections))
	for label, children := range sections {
		result = append(result, models.BlogManifestSection{
			Label:    label,
			Children: children,
		})
	}

	return result, nil
}

// CreatePage inserts a page and creates an initial history entry inside a single transaction.
func (s *PageService) CreatePage(ctx context.Context, page models.Page) error {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	contentJSONBytes := []byte(page.ContentJSON)
	if len(contentJSONBytes) == 0 {
		contentJSONBytes = []byte("{}")
	}

	if page.Position == "" {
		lastPos, posErr := s.pageRepo.LastPosition(ctx, page.SpaceID, page.ParentPageID)
		if posErr != nil {
			return fmt.Errorf("getting last position: %w", posErr)
		}
		page.Position = fractional.NextPosition(lastPos)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO pages (id, slug_id, title, icon, cover_photo, content_json, ydoc,
		                   text_content, position, is_published, parent_page_id, space_id, creator_id,
		                   last_updated_by_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
		page.ID, page.SlugID, page.Title, page.Icon, page.CoverPhoto,
		contentJSONBytes, page.YDoc, page.TextContent, page.Position, page.IsPublished,
		page.ParentPageID, page.SpaceID, page.CreatorID, page.LastUpdatedByID,
		page.CreatedAt, page.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("inserting page %q: %w", page.SlugID, err)
	}

	if err := s.insertHistoryTx(ctx, tx, page, "create", page.CreatorID); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

// UpdatePage updates a page's mutable fields and records a history entry inside a transaction.
func (s *PageService) UpdatePage(ctx context.Context, pageID string, userID string, input UpdatePageInput) (models.Page, error) {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Fetch current page within transaction so we can merge fields.
	var current models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&current.ID, &current.SlugID, &current.Title, &current.Icon, &current.CoverPhoto,
		&contentJSONBytes, &current.YDoc, &current.TextContent, &current.Position, &current.IsPublished,
		&current.ParentPageID, &current.SpaceID, &current.CreatorID, &current.LastUpdatedByID,
		&current.CreatedAt, &current.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	current.ContentJSON = json.RawMessage(contentJSONBytes)

	// Apply partial updates.
	if input.Title != nil {
		current.Title = *input.Title
	}
	if input.Icon != nil {
		current.Icon = *input.Icon
	}
	if input.CoverPhoto != nil {
		current.CoverPhoto = *input.CoverPhoto
	}
	if input.ContentJSON != nil {
		current.ContentJSON = *input.ContentJSON
	}
	if input.TextContent != nil {
		current.TextContent = *input.TextContent
	}
	current.UpdatedAt = time.Now().UTC()
	current.LastUpdatedByID = &userID

	// Write updated page.
	newContentJSONBytes := []byte(current.ContentJSON)
	if len(newContentJSONBytes) == 0 {
		newContentJSONBytes = []byte("{}")
	}

	_, err = tx.Exec(ctx,
		`UPDATE pages
		 SET title = $1, icon = $2, cover_photo = $3, content_json = $4,
		     text_content = $5, position = $6, is_published = $7, parent_page_id = $8,
		     last_updated_by_id = $9, updated_at = $10
		 WHERE id = $11`,
		current.Title, current.Icon, current.CoverPhoto, newContentJSONBytes,
		current.TextContent, current.Position, current.IsPublished, current.ParentPageID,
		current.LastUpdatedByID, current.UpdatedAt, current.ID,
	)
	if err != nil {
		return models.Page{}, fmt.Errorf("updating page %q: %w", pageID, err)
	}

	// Record history.
	if err := s.insertHistoryTx(ctx, tx, current, "update", userID); err != nil {
		return models.Page{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Page{}, fmt.Errorf("commit tx: %w", err)
	}

	return current, nil
}

// DeletePage deletes a page and all its descendants, recording history for each.
func (s *PageService) DeletePage(ctx context.Context, pageID string, userID string) error {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Delete all descendants.
	err = s.deletePageAndDescendantsTx(ctx, tx, pageID, userID)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

// PublishPage sets is_published = true and records history.
func (s *PageService) PublishPage(ctx context.Context, pageID string, userID string) (models.Page, error) {
	return s.setPublished(ctx, pageID, userID, true)
}

// UnpublishPage sets is_published = false and records history.
func (s *PageService) UnpublishPage(ctx context.Context, pageID string, userID string) (models.Page, error) {
	return s.setPublished(ctx, pageID, userID, false)
}

// setPublished toggles is_published and records history in a transaction.
func (s *PageService) setPublished(ctx context.Context, pageID string, userID string, published bool) (models.Page, error) {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var page models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&page.ID, &page.SlugID, &page.Title, &page.Icon, &page.CoverPhoto,
		&contentJSONBytes, &page.YDoc, &page.TextContent, &page.Position, &page.IsPublished,
		&page.ParentPageID, &page.SpaceID, &page.CreatorID, &page.LastUpdatedByID,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	page.ContentJSON = json.RawMessage(contentJSONBytes)

	page.IsPublished = published
	page.UpdatedAt = time.Now().UTC()
	page.LastUpdatedByID = &userID

	_, err = tx.Exec(ctx,
		`UPDATE pages SET is_published = $1, updated_at = $2, last_updated_by_id = $3 WHERE id = $4`,
		page.IsPublished, page.UpdatedAt, page.LastUpdatedByID, page.ID,
	)
	if err != nil {
		return models.Page{}, fmt.Errorf("publishing page %q: %w", pageID, err)
	}

	operation := "publish"
	if !published {
		operation = "unpublish"
	}
	if err := s.insertHistoryTx(ctx, tx, page, operation, userID); err != nil {
		return models.Page{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Page{}, fmt.Errorf("commit tx: %w", err)
	}

	return page, nil
}

// ListRootPages returns root-level pages in a space as tree items.
func (s *PageService) ListRootPages(ctx context.Context, spaceID string) ([]models.PageTreeItem, error) {
	return s.pageRepo.ListRoots(ctx, spaceID)
}

// ListChildPages returns child pages of a parent as tree items.
func (s *PageService) ListChildPages(ctx context.Context, parentID string) ([]models.PageTreeItem, error) {
	return s.pageRepo.ListChildren(ctx, parentID)
}

// ListTree returns all pages in a space as a flat tree.
func (s *PageService) ListTree(ctx context.Context, spaceID string) ([]models.PageTreeItem, error) {
	return s.pageRepo.ListTree(ctx, spaceID)
}

// MovePage repositions a page within the tree (changes parent and/or position).
func (s *PageService) MovePage(ctx context.Context, pageID string, newParentID *string, newPosition *string, userID string) (models.Page, error) {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var page models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&page.ID, &page.SlugID, &page.Title, &page.Icon, &page.CoverPhoto,
		&contentJSONBytes, &page.YDoc, &page.TextContent, &page.Position, &page.IsPublished,
		&page.ParentPageID, &page.SpaceID, &page.CreatorID, &page.LastUpdatedByID,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	page.ContentJSON = json.RawMessage(contentJSONBytes)

	// Update parent if specified.
	if newParentID != nil {
		page.ParentPageID = newParentID
	}

	// Update position if specified.
	if newPosition != nil {
		// Validate the position key.
		if err := fractional.Validate(*newPosition); err != nil {
			return models.Page{}, fmt.Errorf("invalid position %q: %w", *newPosition, err)
		}
		page.Position = *newPosition
	}

	page.UpdatedAt = time.Now().UTC()
	page.LastUpdatedByID = &userID

	_, err = tx.Exec(ctx,
		`UPDATE pages SET parent_page_id = $1, position = $2, updated_at = $3, last_updated_by_id = $4 WHERE id = $5`,
		page.ParentPageID, page.Position, page.UpdatedAt, page.LastUpdatedByID, page.ID,
	)
	if err != nil {
		return models.Page{}, fmt.Errorf("moving page %q: %w", pageID, err)
	}

	if err := s.insertHistoryTx(ctx, tx, page, "move", userID); err != nil {
		return models.Page{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Page{}, fmt.Errorf("commit tx: %w", err)
	}

	return page, nil
}

// GetPageHistory returns all history entries for a page.
func (s *PageService) GetPageHistory(ctx context.Context, pageID string) ([]models.PageHistory, error) {
	return s.pageHistoryRepo.ListByPageID(ctx, pageID)
}

// GetHistoryEntry returns a single history entry by ID.
func (s *PageService) GetHistoryEntry(ctx context.Context, historyID string) (models.PageHistory, error) {
	return s.pageHistoryRepo.GetByID(ctx, historyID)
}

// RestorePage restores a page's content from a history entry and records the restoration.
func (s *PageService) RestorePage(ctx context.Context, pageID string, historyID string, userID string) (models.Page, error) {
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Fetch history entry.
	history, err := s.pageHistoryRepo.GetByID(ctx, historyID)
	if err != nil {
		return models.Page{}, err
	}
	if history.PageID != pageID {
		return models.Page{}, fmt.Errorf("history entry %q does not belong to page %q", historyID, pageID)
	}

	// Fetch current page.
	var page models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&page.ID, &page.SlugID, &page.Title, &page.Icon, &page.CoverPhoto,
		&contentJSONBytes, &page.YDoc, &page.TextContent, &page.Position, &page.IsPublished,
		&page.ParentPageID, &page.SpaceID, &page.CreatorID, &page.LastUpdatedByID,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}

	// Restore content from history.
	page.Title = history.Title
	page.ContentJSON = history.ContentJSON
	page.TextContent = history.TextContent
	page.UpdatedAt = time.Now().UTC()
	page.LastUpdatedByID = &userID

	newContentJSONBytes := []byte(page.ContentJSON)
	if len(newContentJSONBytes) == 0 {
		newContentJSONBytes = []byte("{}")
	}

	_, err = tx.Exec(ctx,
		`UPDATE pages SET title = $1, content_json = $2, text_content = $3,
		     updated_at = $4, last_updated_by_id = $5 WHERE id = $6`,
		page.Title, newContentJSONBytes, page.TextContent,
		page.UpdatedAt, page.LastUpdatedByID, page.ID,
	)
	if err != nil {
		return models.Page{}, fmt.Errorf("restoring page %q: %w", pageID, err)
	}

	// Record the restore operation.
	if err := s.insertHistoryTx(ctx, tx, page, "restore", userID); err != nil {
		return models.Page{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Page{}, fmt.Errorf("commit tx: %w", err)
	}

	return page, nil
}

// ErrBlogPostNotFound is returned when a blog post is not found
var ErrBlogPostNotFound = errors.New("blog post not found")

// ErrPageNotFound is returned when a page is not found.
var ErrPageNotFound = errors.New("page not found")

// ErrHistoryNotFound is returned when a history entry is not found.
var ErrHistoryNotFound = errors.New("history entry not found")

// ListAllPages returns all pages (published and drafts) from the database.
func (s *PageService) ListAllPages(ctx context.Context) ([]models.Page, error) {
	pages, err := s.pageRepo.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing all pages: %w", err)
	}
	return pages, nil
}

// GetPageByID returns a page by its primary key ID.
func (s *PageService) GetPageByID(ctx context.Context, id string) (models.Page, error) {
	page, err := s.pageRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("getting page by id %q: %w", id, err)
	}
	return page, nil
}

// insertHistoryTx inserts a page_history row within an existing transaction.
func (s *PageService) insertHistoryTx(ctx context.Context, tx pgx.Tx, page models.Page, operation string, userID string) error {
	historyID := uuid.New().String()
	historyContentJSON := []byte(page.ContentJSON)
	if len(historyContentJSON) == 0 {
		historyContentJSON = []byte("{}")
	}

	_, err := tx.Exec(ctx,
		`INSERT INTO page_history (id, page_id, title, content_json, ydoc,
		                          text_content, operation, created_by_id, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		historyID, page.ID, page.Title, historyContentJSON, page.YDoc,
		page.TextContent, operation, userID, time.Now().UTC(),
	)
	if err != nil {
		return fmt.Errorf("inserting page history for page %q: %w", page.ID, err)
	}

	return nil
}

// deletePageAndDescendantsTx recursively deletes a page and its descendants within a transaction.
func (s *PageService) deletePageAndDescendantsTx(ctx context.Context, tx pgx.Tx, pageID string, userID string) error {
	// Find all children.
	rows, err := tx.Query(ctx, `SELECT id FROM pages WHERE parent_page_id = $1`, pageID)
	if err != nil {
		return fmt.Errorf("finding children of page %q: %w", pageID, err)
	}
	defer rows.Close()

	var childIDs []string
	for rows.Next() {
		var childID string
		if err := rows.Scan(&childID); err != nil {
			return fmt.Errorf("scanning child id: %w", err)
		}
		childIDs = append(childIDs, childID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating children: %w", err)
	}

	// Recursively delete children first.
	for _, childID := range childIDs {
		if err := s.deletePageAndDescendantsTx(ctx, tx, childID, userID); err != nil {
			return err
		}
	}

	// Record history before deleting.
	var page models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&page.ID, &page.SlugID, &page.Title, &page.Icon, &page.CoverPhoto,
		&contentJSONBytes, &page.YDoc, &page.TextContent, &page.Position, &page.IsPublished,
		&page.ParentPageID, &page.SpaceID, &page.CreatorID, &page.LastUpdatedByID,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("fetching page to delete %q: %w", pageID, err)
	}
	page.ContentJSON = json.RawMessage(contentJSONBytes)

	if err := s.insertHistoryTx(ctx, tx, page, "delete", userID); err != nil {
		return err
	}

	// Delete page_history entries (CASCADE would handle this, but explicit is safer).
	_, err = tx.Exec(ctx, `DELETE FROM page_history WHERE page_id = $1`, pageID)
	if err != nil {
		return fmt.Errorf("deleting history for page %q: %w", pageID, err)
	}

	// Delete the page.
	_, err = tx.Exec(ctx, `DELETE FROM pages WHERE id = $1`, pageID)
	if err != nil {
		return fmt.Errorf("deleting page %q: %w", pageID, err)
	}

	return nil
}

// pageToBlogPost converts a Page model to a BlogPost response shape.
func (s *PageService) pageToBlogPost(page models.Page) models.BlogPost {
	description := page.TextContent
	if len(description) > 200 {
		description = description[:200] + "..."
	}

	post := models.BlogPost{
		Description:     description,
		PublishedAt:     page.CreatedAt.Format(time.RFC3339),
		ReadTimeMinutes: estimateReadTime(page.TextContent),
		Section:         extractSection(page.SlugID),
		Slug:            page.SlugID,
		Tags:            []string{extractSection(page.SlugID)},
		Title:           page.Title,
		ContentJSON:     page.ContentJSON,
		Icon:            page.Icon,
		CoverPhoto:      page.CoverPhoto,
	}

	return post
}

// ToMap converts a Page's ContentJSON to a map for external consumption
func ToMap(raw json.RawMessage) map[string]any {
	if raw == nil {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil
	}
	return m
}

// extractSection extracts a section label from a slug
func extractSection(slug string) string {
	idx := strings.Index(slug, "/")
	if idx >= 0 {
		return slug[:idx]
	}
	return slug
}

// estimateReadTime estimates read time in minutes based on text length
func estimateReadTime(text string) int {
	words := 0
	inWord := false
	for _, c := range text {
		if c == ' ' || c == '\n' || c == '\t' || c == '\r' {
			inWord = false
		} else if !inWord {
			inWord = true
			words++
		}
	}
	minutes := words / 200
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}

// newUUID generates a RFC 4122 v4 UUID string.
func newUUID() string {
	return uuid.New().String()
}
