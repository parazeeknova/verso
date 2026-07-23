package page

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"verso/backy/database"
	"verso/backy/database/models"
	notifeat "verso/backy/features/notification"
	"verso/backy/repositories"
	"verso/backy/shared/fractional"
)

// PageService provides business logic over page and page history repositories
type PageService struct {
	pageRepo        *repositories.PageRepo
	pageWatcherRepo *repositories.PageWatcherRepo
	pageHistoryRepo *repositories.PageHistoryRepo
	spaceRepo       *repositories.SpaceRepo
	groupRepo       *repositories.GroupRepo
	pageShareRepo   *repositories.PageShareRepo
	notifier        notifeat.Notifier
}

// NewPageService creates a new page service
func NewPageService(pageRepo *repositories.PageRepo, pageWatcherRepo *repositories.PageWatcherRepo, pageHistoryRepo *repositories.PageHistoryRepo, spaceRepo *repositories.SpaceRepo, groupRepo *repositories.GroupRepo) *PageService {
	return &PageService{
		pageRepo:        pageRepo,
		pageWatcherRepo: pageWatcherRepo,
		pageHistoryRepo: pageHistoryRepo,
		spaceRepo:       spaceRepo,
		groupRepo:       groupRepo,
		pageShareRepo:   repositories.NewPageShareRepo(),
		notifier:        notifeat.NoopNotifier(),
	}
}

// SetNotifier sets the notification service on the page service.
func (s *PageService) SetNotifier(n notifeat.Notifier) {
	s.notifier = n
}

// UpdatePageInput holds the fields that can be updated on a page.
type UpdatePageInput struct {
	Title       *string          `json:"title"`
	Icon        *string          `json:"icon"`
	CoverPhoto  *string          `json:"coverPhoto"`
	ContentJSON *json.RawMessage `json:"contentJson"`
	TextContent *string          `json:"textContent"`
	IsLocked    *bool            `json:"isLocked"`
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
	if err := s.requireWrite(ctx, page.SpaceID, page.CreatorID); err != nil {
		return err
	}

	// Look up workspace_id from space.
	space, err := s.spaceRepo.GetByID(ctx, page.SpaceID)
	if err != nil {
		return fmt.Errorf("getting space for page: %w", err)
	}
	page.WorkspaceID = space.WorkspaceID

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

	_, err = tx.Exec(
		ctx,
		`INSERT INTO pages (id, slug_id, title, icon, cover_photo, content_json, ydoc,
		                   text_content, position, is_published, parent_page_id, space_id, workspace_id, creator_id,
		                   last_updated_by_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
		page.ID, page.SlugID, page.Title, page.Icon, page.CoverPhoto,
		contentJSONBytes, page.YDoc, page.TextContent, page.Position, page.IsPublished,
		page.ParentPageID, page.SpaceID, page.WorkspaceID, page.CreatorID, page.LastUpdatedByID,
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

	recipients, _ := s.spaceRepo.ListWorkspaceMemberIDs(ctx, page.WorkspaceID)
	meta := map[string]string{"name": page.Title}
	if page.Icon == "folder" {
		meta["isFolder"] = "true"
	}
	s.notifier.Notify(ctx, notifeat.NotificationEvent{
		Type:         notifeat.EventPageCreated,
		WorkspaceID:  page.WorkspaceID,
		ActorID:      page.CreatorID,
		RecipientIDs: recipients,
		EntityType:   "page",
		EntityID:     page.ID,
		Metadata:     meta,
	})

	return nil
}

// UpdatePage updates a page's mutable fields and records a history entry inside a transaction.
func (s *PageService) UpdatePage(ctx context.Context, pageID string, userID string, input UpdatePageInput) (models.Page, error) {
	var current models.Page
	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Fetch current page within transaction so we can merge fields.
	var contentJSONBytes []byte
	err = tx.QueryRow(
		ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, is_locked, parent_page_id, space_id, workspace_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1 FOR UPDATE`, pageID,
	).Scan(
		&current.ID, &current.SlugID, &current.Title, &current.Icon, &current.CoverPhoto,
		&contentJSONBytes, &current.YDoc, &current.TextContent, &current.Position, &current.IsPublished, &current.IsLocked,
		&current.ParentPageID, &current.SpaceID, &current.WorkspaceID, &current.CreatorID, &current.LastUpdatedByID,
		&current.CreatedAt, &current.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	current.ContentJSON = json.RawMessage(contentJSONBytes)

	// Check permission.
	if err := s.requireWrite(ctx, current.SpaceID, userID); err != nil {
		return models.Page{}, err
	}

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
	if input.IsLocked != nil {
		current.IsLocked = *input.IsLocked
	}
	current.UpdatedAt = time.Now().UTC()
	current.LastUpdatedByID = &userID

	// Write updated page.
	newContentJSONBytes := []byte(current.ContentJSON)
	if len(newContentJSONBytes) == 0 {
		newContentJSONBytes = []byte("{}")
	}

	_, err = tx.Exec(
		ctx,
		`UPDATE pages
		 SET title = $1, icon = $2, cover_photo = $3, content_json = $4,
		     text_content = $5, position = $6, is_published = $7, is_locked = $8, parent_page_id = $9,
		     last_updated_by_id = $10, updated_at = $11
		 WHERE id = $12`,
		current.Title, current.Icon, current.CoverPhoto, newContentJSONBytes,
		current.TextContent, current.Position, current.IsPublished, current.IsLocked, current.ParentPageID,
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

	// Autosave updates only content, so skip watcher notifications unless
	// the mutation changed visible page metadata.
	if input.Title != nil || input.Icon != nil || input.CoverPhoto != nil {
		s.notifyPageUpdated(ctx, current, userID)
	}

	return current, nil
}

// DeletePage soft-deletes a page and all its descendants, recording history for each.
func (s *PageService) DeletePage(ctx context.Context, pageID string, userID string) error {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return ErrPageNotFound
		}
		return fmt.Errorf("fetching page %q: %w", pageID, err)
	}

	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return err
	}

	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Soft-delete all descendants.
	deletedPages := make([]models.Page, 0)
	err = s.softDeletePageAndDescendantsTx(ctx, tx, pageID, userID, &deletedPages)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	for _, deletedPage := range deletedPages {
		s.notifyPageDeleted(ctx, deletedPage, userID)
	}

	return nil
}

// PublishPage sets is_published = true and records history.
func (s *PageService) PublishPage(ctx context.Context, pageID string, userID string) (models.Page, error) {
	page, err := s.setPublished(ctx, pageID, userID, true)
	if err != nil {
		return models.Page{}, err
	}
	s.notifyPageUpdated(ctx, page, userID)
	return page, nil
}

// UnpublishPage sets is_published = false and records history.
func (s *PageService) UnpublishPage(ctx context.Context, pageID string, userID string) (models.Page, error) {
	page, err := s.setPublished(ctx, pageID, userID, false)
	if err != nil {
		return models.Page{}, err
	}
	s.notifyPageUpdated(ctx, page, userID)
	return page, nil
}

// setPublished toggles is_published and records history in a transaction.
func (s *PageService) setPublished(ctx context.Context, pageID string, userID string, published bool) (models.Page, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}

	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.Page{}, err
	}

	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	page.IsPublished = published
	page.UpdatedAt = time.Now().UTC()
	page.LastUpdatedByID = &userID

	_, err = tx.Exec(
		ctx,
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
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}

	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.Page{}, err
	}

	pool := database.GetPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return models.Page{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var contentJSONBytes []byte
	err = tx.QueryRow(
		ctx,
		`SELECT content_json
		 FROM pages WHERE id = $1`, pageID,
	).Scan(&contentJSONBytes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page content %q: %w", pageID, err)
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

	_, err = tx.Exec(
		ctx,
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

	s.notifyPageUpdated(ctx, page, userID)

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
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("fetching page %q: %w", pageID, err)
	}

	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.Page{}, err
	}

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

	_, err = tx.Exec(
		ctx,
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

	s.notifyPageUpdated(ctx, page, userID)

	return page, nil
}

// DeleteHistoryEntry deletes a single history entry after verifying write permissions.
func (s *PageService) DeleteHistoryEntry(ctx context.Context, pageID string, historyID string, userID string) error {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return ErrPageNotFound
		}
		return err
	}
	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return err
	}
	history, err := s.pageHistoryRepo.GetByID(ctx, historyID)
	if err != nil {
		return err
	}
	if history.PageID != pageID {
		return fmt.Errorf("history entry %q does not belong to page %q", historyID, pageID)
	}
	return s.pageHistoryRepo.DeleteByID(ctx, historyID)
}

// DeleteAllPageHistory deletes all history entries for a page after verifying write permissions.
func (s *PageService) DeleteAllPageHistory(ctx context.Context, pageID string, userID string) error {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return ErrPageNotFound
		}
		return err
	}
	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return err
	}
	return s.pageHistoryRepo.DeleteAllByPageID(ctx, pageID)
}

// ErrBlogPostNotFound is returned when a blog post is not found
var ErrBlogPostNotFound = errors.New("blog post not found")

// ErrPageNotFound is returned when a page is not found.
var ErrPageNotFound = repositories.ErrPageNotFound

// ErrHistoryNotFound is returned when a history entry is not found.
var ErrHistoryNotFound = errors.New("history entry not found")

// ErrPagePermissionDenied is returned when a user lacks permission for a page action.
var ErrPagePermissionDenied = errors.New("permission denied for this page")

// ListAllPages returns all pages (published and drafts) from the database.
func (s *PageService) ListAllPages(ctx context.Context) ([]models.Page, error) {
	pages, err := s.pageRepo.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing all pages: %w", err)
	}
	return pages, nil
}

// ListPagesForUser returns all pages in spaces the user is a member of.
func (s *PageService) ListPagesForUser(ctx context.Context, userID string) ([]models.Page, error) {
	pages, err := s.pageRepo.ListAllForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("listing pages for user: %w", err)
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

// GetPageBySpaceAndSlug returns a page by its space ID and slug ID.
func (s *PageService) GetPageBySpaceAndSlug(ctx context.Context, spaceID, slugID string) (models.Page, error) {
	page, err := s.pageRepo.GetBySpaceAndSlug(ctx, spaceID, slugID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return models.Page{}, ErrPageNotFound
		}
		return models.Page{}, fmt.Errorf("getting page by space %q slug %q: %w", spaceID, slugID, err)
	}
	return page, nil
}

// requireWrite checks if a user can write (create/update/delete/move) pages in a space.
func (s *PageService) requireWrite(ctx context.Context, spaceID, userID string) error {
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("checking space: %w", err)
	}
	if space.CreatedBy == userID {
		return nil
	}

	var groupIDs []string
	if s.groupRepo != nil {
		groupIDs, _ = s.groupRepo.ListUserGroupIDsInWorkspace(ctx, userID, space.WorkspaceID)
	}

	role, err := s.spaceRepo.GetEffectiveRole(ctx, spaceID, userID, groupIDs)
	if err != nil {
		return fmt.Errorf("checking effective role: %w", err)
	}
	if role == models.SpaceRoleAdmin || role == models.SpaceRoleWriter {
		return nil
	}
	return ErrPagePermissionDenied
}

// RequireRead checks if a user can read pages in a space.
func (s *PageService) RequireRead(ctx context.Context, spaceID, userID string) error {
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("checking space: %w", err)
	}
	if space.CreatedBy == userID {
		return nil
	}

	var groupIDs []string
	if s.groupRepo != nil {
		groupIDs, _ = s.groupRepo.ListUserGroupIDsInWorkspace(ctx, userID, space.WorkspaceID)
	}

	role, err := s.spaceRepo.GetEffectiveRole(ctx, spaceID, userID, groupIDs)
	if err != nil {
		return fmt.Errorf("checking effective role: %w", err)
	}
	if role == models.SpaceRoleAdmin || role == models.SpaceRoleWriter || role == models.SpaceRoleReader {
		return nil
	}
	return ErrPagePermissionDenied
}

// CanWrite reports whether a user can write pages in a space.
func (s *PageService) CanWrite(ctx context.Context, spaceID, userID string) (bool, error) {
	if err := s.requireWrite(ctx, spaceID, userID); err != nil {
		if errors.Is(err, ErrPagePermissionDenied) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// insertHistoryTx inserts a page_history row within an existing transaction.
func (s *PageService) insertHistoryTx(ctx context.Context, tx pgx.Tx, page models.Page, operation string, userID string) error {
	historyContentJSON := []byte(page.ContentJSON)
	if len(historyContentJSON) == 0 {
		historyContentJSON = []byte("{}")
	}

	// For update operations, skip recording duplicate history if page content and title haven't changed.
	if operation == "update" {
		var lastTitle string
		var lastContentJSON []byte
		var lastTextContent string

		err := tx.QueryRow(
			ctx,
			`SELECT title, content_json, text_content
			 FROM page_history
			 WHERE page_id = $1
			 ORDER BY created_at DESC
			 LIMIT 1`,
			page.ID,
		).Scan(&lastTitle, &lastContentJSON, &lastTextContent)

		if err == nil &&
			lastTitle == page.Title &&
			bytes.Equal(bytes.TrimSpace(lastContentJSON), bytes.TrimSpace(historyContentJSON)) &&
			lastTextContent == page.TextContent {
			// No changes detected since the last history entry, skip inserting duplicate history.
			return nil
		}
	}

	historyID := uuid.New().String()

	_, err := tx.Exec(
		ctx,
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

// softDeletePageAndDescendantsTx recursively soft-deletes a page and its descendants within a transaction.
func (s *PageService) softDeletePageAndDescendantsTx(ctx context.Context, tx pgx.Tx, pageID string, userID string, deletedPages *[]models.Page) error {
	// Find all children.
	rows, err := tx.Query(ctx, `SELECT id FROM pages WHERE parent_page_id = $1 AND deleted_at IS NULL`, pageID)
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

	// Recursively soft-delete children first.
	for _, childID := range childIDs {
		if err := s.softDeletePageAndDescendantsTx(ctx, tx, childID, userID, deletedPages); err != nil {
			return err
		}
	}

	// Record history before soft-deleting.
	var page models.Page
	var contentJSONBytes []byte
	err = tx.QueryRow(
		ctx,
		`SELECT id, slug_id, title, icon, cover_photo, content_json, ydoc,
		        text_content, position, is_published, parent_page_id, space_id, workspace_id, creator_id,
		        last_updated_by_id, created_at, updated_at
		 FROM pages WHERE id = $1`, pageID,
	).Scan(
		&page.ID, &page.SlugID, &page.Title, &page.Icon, &page.CoverPhoto,
		&contentJSONBytes, &page.YDoc, &page.TextContent, &page.Position, &page.IsPublished,
		&page.ParentPageID, &page.SpaceID, &page.WorkspaceID, &page.CreatorID, &page.LastUpdatedByID,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("fetching page to delete %q: %w", pageID, err)
	}
	page.ContentJSON = json.RawMessage(contentJSONBytes)

	*deletedPages = append(*deletedPages, page)

	// Soft-delete the page and clear its history.
	_, err = tx.Exec(ctx, `UPDATE pages SET deleted_at = now(), deleted_by_id = $1 WHERE id = $2`, userID, pageID)
	if err != nil {
		return fmt.Errorf("soft-deleting page %q: %w", pageID, err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM page_history WHERE page_id = $1`, pageID); err != nil {
		return fmt.Errorf("deleting page history for page %q: %w", pageID, err)
	}

	return nil
}

func (s *PageService) notifyPageUpdated(ctx context.Context, page models.Page, actorID string) {
	if s.notifier == nil || s.pageWatcherRepo == nil || s.spaceRepo == nil {
		return
	}
	watchers, err := s.pageWatcherRepo.ListByPage(ctx, page.ID)
	if err != nil || len(watchers) == 0 {
		return
	}
	members, err := s.spaceRepo.ListWorkspaceMemberIDs(ctx, page.WorkspaceID)
	if err != nil || len(members) == 0 {
		return
	}
	memberSet := makeMembershipSet(members)
	recipients := filterMemberIDs(memberSet, watchers)
	if len(recipients) == 0 {
		return
	}
	s.notifier.Notify(ctx, notifeat.NotificationEvent{
		Type:         notifeat.EventPageUpdated,
		WorkspaceID:  page.WorkspaceID,
		ActorID:      actorID,
		RecipientIDs: recipients,
		EntityType:   "page",
		EntityID:     page.ID,
		Metadata:     map[string]string{"name": page.Title},
	})
}

func (s *PageService) notifyPageDeleted(ctx context.Context, page models.Page, actorID string) {
	if s.notifier == nil || s.spaceRepo == nil {
		return
	}
	recipients, err := s.spaceRepo.ListWorkspaceMemberIDs(ctx, page.WorkspaceID)
	if err != nil || len(recipients) == 0 {
		return
	}
	memberSet := makeMembershipSet(recipients)
	if s.pageWatcherRepo != nil {
		watchers, err := s.pageWatcherRepo.ListByPage(ctx, page.ID)
		if err == nil {
			recipients = appendUniqueStrings(recipients, filterMemberIDs(memberSet, watchers))
		}
	}
	if len(recipients) == 0 {
		return
	}
	s.notifier.Notify(ctx, notifeat.NotificationEvent{
		Type:         notifeat.EventPageDeleted,
		WorkspaceID:  page.WorkspaceID,
		ActorID:      actorID,
		RecipientIDs: recipients,
		EntityType:   "page",
		EntityID:     page.ID,
		Metadata:     map[string]string{"name": page.Title},
	})
}

func makeMembershipSet(memberIDs []string) map[string]struct{} {
	memberSet := make(map[string]struct{}, len(memberIDs))
	for _, memberID := range memberIDs {
		memberSet[memberID] = struct{}{}
	}
	return memberSet
}

func filterMemberIDs(memberSet map[string]struct{}, ids []string) []string {
	filtered := make([]string, 0, len(ids))
	seen := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if _, ok := memberSet[id]; !ok {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		filtered = append(filtered, id)
	}
	return filtered
}

func appendUniqueStrings(base []string, values []string) []string {
	seen := make(map[string]struct{}, len(base)+len(values))
	merged := make([]string, 0, len(base)+len(values))
	for _, value := range base {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		merged = append(merged, value)
	}
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		merged = append(merged, value)
	}
	return merged
}

// WatchPage toggles the current user's watcher status for a page.
func (s *PageService) WatchPage(ctx context.Context, pageID, userID string) (bool, error) {
	if s.pageWatcherRepo == nil {
		return false, fmt.Errorf("page watchers not available")
	}
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return false, ErrPageNotFound
		}
		return false, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	if err := s.RequireRead(ctx, page.SpaceID, userID); err != nil {
		return false, err
	}
	return s.pageWatcherRepo.Toggle(ctx, userID, pageID)
}

// IsPageWatched returns whether the current user watches the page.
func (s *PageService) IsPageWatched(ctx context.Context, pageID, userID string) (bool, error) {
	if s.pageWatcherRepo == nil {
		return false, nil
	}
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrPageNotFound) {
			return false, ErrPageNotFound
		}
		return false, fmt.Errorf("fetching page %q: %w", pageID, err)
	}
	if err := s.RequireRead(ctx, page.SpaceID, userID); err != nil {
		return false, err
	}
	return s.pageWatcherRepo.IsWatching(ctx, userID, pageID)
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

func generateRandomString(n int) (string, error) {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", fmt.Errorf("generating random string: %w", err)
		}
		ret[i] = letters[num.Int64()]
	}
	return string(ret), nil
}

func (s *PageService) GetPageShare(ctx context.Context, pageID string, userID string) (models.PageShare, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return models.PageShare{}, err
	}
	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.PageShare{}, err
	}

	share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrShareNotFound) {
			return models.PageShare{
				PageID:    pageID,
				IsEnabled: false,
			}, nil
		}
		return models.PageShare{}, err
	}
	return share, nil
}

func (s *PageService) UpdatePageShare(ctx context.Context, pageID string, userID string, isEnabled bool, searchIndexing bool, accessLevel string) (models.PageShare, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return models.PageShare{}, err
	}
	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.PageShare{}, err
	}

	if accessLevel == "" {
		accessLevel = "read"
	} else if accessLevel != "read" && accessLevel != "edit" && accessLevel != "public_edit" {
		return models.PageShare{}, fmt.Errorf("invalid access level %q: must be read, edit, or public_edit", accessLevel)
	}

	share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
	if err != nil {
		if errors.Is(err, repositories.ErrShareNotFound) {
			token, err := generateRandomString(32)
			if err != nil {
				return models.PageShare{}, err
			}
			share = models.PageShare{
				ID:             newUUID(),
				PageID:         pageID,
				ShareToken:     token,
				SearchIndexing: searchIndexing,
				IsEnabled:      isEnabled,
				AccessLevel:    accessLevel,
			}
		} else {
			return models.PageShare{}, err
		}
	} else {
		share.IsEnabled = isEnabled
		share.SearchIndexing = searchIndexing
		share.AccessLevel = accessLevel
		if share.ShareToken == "" {
			token, err := generateRandomString(32)
			if err != nil {
				return models.PageShare{}, err
			}
			share.ShareToken = token
		}
	}

	updatedShare, err := s.pageShareRepo.Upsert(ctx, share)
	if err != nil {
		return models.PageShare{}, err
	}

	return updatedShare, nil
}

func (s *PageService) ShortenPageShare(ctx context.Context, pageID string, userID string) (models.PageShare, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return models.PageShare{}, err
	}
	if err := s.requireWrite(ctx, page.SpaceID, userID); err != nil {
		return models.PageShare{}, err
	}

	share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
	if err != nil {
		return models.PageShare{}, err
	}

	if share.ShortCode == nil || *share.ShortCode == "" {
		for i := 0; i < 5; i++ {
			code, err := generateRandomString(8)
			if err != nil {
				return models.PageShare{}, err
			}
			share.ShortCode = &code
			updatedShare, err := s.pageShareRepo.Upsert(ctx, share)
			if err == nil {
				return updatedShare, nil
			}
			if i == 4 {
				return models.PageShare{}, err
			}
		}
	}

	return share, nil
}

func (s *PageService) GetPageByShareToken(ctx context.Context, token string) (models.Page, models.PageShare, error) {
	share, err := s.pageShareRepo.GetByShareToken(ctx, token)
	if err != nil {
		return models.Page{}, models.PageShare{}, err
	}

	if !share.IsEnabled {
		return models.Page{}, models.PageShare{}, repositories.ErrShareNotFound
	}

	page, err := s.pageRepo.GetByID(ctx, share.PageID)
	if err != nil {
		return models.Page{}, models.PageShare{}, err
	}

	return page, share, nil
}

func (s *PageService) GetPageByShortCode(ctx context.Context, shortCode string) (models.Page, models.PageShare, error) {
	share, err := s.pageShareRepo.GetByShortCode(ctx, shortCode)
	if err != nil {
		return models.Page{}, models.PageShare{}, err
	}

	if !share.IsEnabled {
		return models.Page{}, models.PageShare{}, repositories.ErrShareNotFound
	}

	page, err := s.pageRepo.GetByID(ctx, share.PageID)
	if err != nil {
		return models.Page{}, models.PageShare{}, err
	}

	return page, share, nil
}

func (s *PageService) IsPageShared(ctx context.Context, pageID string) bool {
	share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
	if err != nil {
		return false
	}
	return share.IsEnabled
}

func (s *PageService) GetSharedMapForPages(ctx context.Context, pageIDs []string) map[string]bool {
	if s.pageShareRepo == nil || len(pageIDs) == 0 {
		return map[string]bool{}
	}
	res, err := s.pageShareRepo.GetSharedMapByPageIDs(ctx, pageIDs)
	if err != nil {
		return map[string]bool{}
	}
	return res
}
