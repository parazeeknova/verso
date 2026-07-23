package space

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"

	"verso/backy/database"
	"verso/backy/database/models"
	notifeat "verso/backy/features/notification"
	"verso/backy/repositories"
	"verso/backy/shared/logger"
)

// ErrSpaceNotFound is returned when a space is not found.
var ErrSpaceNotFound = repositories.ErrSpaceNotFound

// ErrSpaceNotEmpty is returned when trying to delete a space that still has pages.
var ErrSpaceNotEmpty = repositories.ErrSpaceNotEmpty

// ErrSpacePermissionDenied is returned when a user lacks permission for an action.
var ErrSpacePermissionDenied = errors.New("permission denied for this space")

type StorageClient interface {
	DeleteBucketAndObjects(ctx context.Context, bucket string) error
}

// SpaceService provides business logic for spaces.
type SpaceService struct {
	spaceRepo     *repositories.SpaceRepo
	pageRepo      *repositories.PageRepo
	groupRepo     *repositories.GroupRepo
	commentRepo   *repositories.CommentRepo
	notifier      notifeat.Notifier
	storageClient StorageClient
}

// NewSpaceService creates a new space service.
func NewSpaceService(spaceRepo *repositories.SpaceRepo, pageRepo *repositories.PageRepo, groupRepo *repositories.GroupRepo) *SpaceService {
	return &SpaceService{
		spaceRepo: spaceRepo,
		pageRepo:  pageRepo,
		groupRepo: groupRepo,
		notifier:  notifeat.NoopNotifier(),
	}
}

// SetCommentRepo sets the comment repository on the space service.
func (s *SpaceService) SetCommentRepo(r *repositories.CommentRepo) {
	s.commentRepo = r
}

// SetNotifier sets the notification service on the space service.
func (s *SpaceService) SetNotifier(n notifeat.Notifier) {
	s.notifier = n
}

// SetStorageClient sets the storage client on the space service.
func (s *SpaceService) SetStorageClient(c StorageClient) {
	s.storageClient = c
}

// CreateSpace creates a new space within a workspace and adds the creator as admin.
func (s *SpaceService) CreateSpace(ctx context.Context, name, slug, icon, description, workspaceID, userID string) (models.Space, error) {
	space := models.Space{
		ID:          uuid.New().String(),
		Name:        name,
		Slug:        slug,
		Icon:        icon,
		Description: description,
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Visibility:  "private",
		DefaultRole: models.SpaceRoleReader,
		Settings:    "{}",
	}

	if err := s.spaceRepo.Insert(ctx, space); err != nil {
		return models.Space{}, fmt.Errorf("creating space: %w", err)
	}

	// Add creator as admin
	if err := s.spaceRepo.AddMember(ctx, space.ID, userID, models.SpaceRoleAdmin); err != nil {
		return models.Space{}, fmt.Errorf("adding creator as admin: %w", err)
	}

	// Refresh member count
	space.MemberCount = 1

	// Notify workspace members (excluding creator)
	recipients, _ := s.workspaceMemberIDsForSpace(ctx, space.WorkspaceID)
	s.notifier.Notify(ctx, notifeat.NotificationEvent{
		Type:         notifeat.EventSpaceCreated,
		WorkspaceID:  workspaceID,
		ActorID:      userID,
		RecipientIDs: recipients,
		EntityType:   "space",
		EntityID:     space.ID,
		Metadata:     map[string]string{"name": name},
	})

	return space, nil
}

// UpdateSpaceParams holds the parameters for updating a space.
type UpdateSpaceParams struct {
	ID          string
	Name        string
	Slug        string
	Icon        string
	Description string
	HeaderImage *string
	UserID      string
}

// UpdateSpace updates an existing space. Requires admin role.
func (s *SpaceService) UpdateSpace(ctx context.Context, p UpdateSpaceParams) (models.Space, error) {
	if err := s.RequireAdmin(ctx, p.ID, p.UserID); err != nil {
		return models.Space{}, err
	}

	existing, err := s.spaceRepo.GetByID(ctx, p.ID)
	if err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("getting space: %w", err)
	}

	oldName := existing.Name
	oldSlug := existing.Slug
	oldIcon := existing.Icon
	oldHeaderImage := existing.HeaderImage

	existing.Name = p.Name
	existing.Slug = p.Slug
	existing.Icon = p.Icon
	existing.Description = p.Description
	if p.HeaderImage != nil {
		existing.HeaderImage = *p.HeaderImage
	}
	existing.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	if err := s.spaceRepo.Update(ctx, existing); err != nil {
		return models.Space{}, fmt.Errorf("updating space: %w", err)
	}

	nameOrSlugChanged := oldName != p.Name || oldSlug != p.Slug
	iconChanged := oldIcon != p.Icon
	headerChanged := oldHeaderImage != existing.HeaderImage

	recipients, _ := s.workspaceMemberIDsForSpace(ctx, existing.WorkspaceID)
	if iconChanged && !nameOrSlugChanged {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventSpaceIconChanged,
			WorkspaceID:  existing.WorkspaceID,
			ActorID:      p.UserID,
			RecipientIDs: recipients,
			EntityType:   "space",
			EntityID:     p.ID,
			Metadata:     map[string]string{"name": p.Name},
		})
	} else if nameOrSlugChanged {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventSpaceRenamed,
			WorkspaceID:  existing.WorkspaceID,
			ActorID:      p.UserID,
			RecipientIDs: recipients,
			EntityType:   "space",
			EntityID:     p.ID,
			Metadata:     map[string]string{"name": p.Name},
		})
	}

	if headerChanged && !nameOrSlugChanged {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventSpaceHeaderImageChanged,
			WorkspaceID:  existing.WorkspaceID,
			ActorID:      p.UserID,
			RecipientIDs: recipients,
			EntityType:   "space",
			EntityID:     p.ID,
			Metadata:     map[string]string{"name": p.Name},
		})
	}

	return existing, nil
}

func (s *SpaceService) workspaceMemberIDsForSpace(ctx context.Context, workspaceID string) ([]string, error) {
	members, err := s.spaceRepo.ListWorkspaceMemberIDs(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing workspace members: %w", err)
	}
	return members, nil
}

// DeleteSpace soft-deletes a space and recursively deletes all pages inside it (and their S3/local assets). Requires admin role.
func (s *SpaceService) DeleteSpace(ctx context.Context, id, userID string) error {
	if err := s.RequireAdmin(ctx, id, userID); err != nil {
		return err
	}

	existing, err := s.spaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("getting space: %w", err)
	}

	if existing.Slug == "nospace" {
		return fmt.Errorf("cannot delete system space nospace")
	}

	pageIDs, err := s.pageRepo.ListIDsInSpace(ctx, id)
	if err != nil {
		return fmt.Errorf("listing pages in space: %w", err)
	}

	if len(pageIDs) > 0 {
		if err := s.pageRepo.SoftDeleteAllInSpace(ctx, id, userID); err != nil {
			return fmt.Errorf("deleting pages from database: %w", err)
		}
	}

	if s.commentRepo != nil {
		if err := s.commentRepo.DeleteBySpaceID(ctx, id); err != nil {
			return fmt.Errorf("deleting comments in space: %w", err)
		}
	}

	pool := database.GetPool()
	_, _ = pool.Exec(ctx, `UPDATE notifications SET deleted_at = now() WHERE (entity_id = $1 OR metadata->>'spaceId' = $1) AND deleted_at IS NULL`, id)
	for _, pageID := range pageIDs {
		_, _ = pool.Exec(ctx, `UPDATE notifications SET deleted_at = now() WHERE (entity_id = $1 OR metadata->>'pageId' = $1) AND deleted_at IS NULL`, pageID)
	}

	if err := s.spaceRepo.SoftDelete(ctx, id); err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("deleting space: %w", err)
	}

	// Trigger asynchronous cleanup after successful database commit
	go func() {
		cleanupCtx := context.Background()
		for _, pageID := range pageIDs {
			for attempt := 0; attempt < 3; attempt++ {
				var storageErr, localErr error
				if s.storageClient != nil {
					storageErr = s.storageClient.DeleteBucketAndObjects(cleanupCtx, pageID)
				}
				localPath := filepath.Join(".", "uploads", pageID)
				localErr = os.RemoveAll(localPath)

				if storageErr == nil && localErr == nil {
					break
				}

				if storageErr != nil {
					logger.Log.Error().Err(storageErr).Str("pageID", pageID).Int("attempt", attempt+1).Msg("failed to clean storage assets on space deletion")
				}
				if localErr != nil {
					logger.Log.Error().Err(localErr).Str("pageID", pageID).Str("path", localPath).Int("attempt", attempt+1).Msg("failed to remove local uploads on space deletion")
				}
				time.Sleep(100 * time.Millisecond)
			}
		}
	}()

	return nil
}

// ListSpaces returns all spaces in a workspace.
func (s *SpaceService) ListSpaces(ctx context.Context, workspaceID string) ([]models.Space, error) {
	spaces, err := s.spaceRepo.ListAll(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing spaces: %w", err)
	}
	return spaces, nil
}

// ListFavoritedSpaces returns spaces by their IDs using a single batch query.
// Missing IDs (soft-deleted spaces) are silently omitted.
func (s *SpaceService) ListFavoritedSpaces(ctx context.Context, ids []string) ([]models.Space, error) {
	if len(ids) == 0 {
		return []models.Space{}, nil
	}

	spaces, err := s.spaceRepo.ListByIDs(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("listing favorited spaces: %w", err)
	}
	return spaces, nil
}

// ListReadableFavoritedSpaces returns favorited spaces the user can read.
// Spaces the user cannot access are silently filtered out.
func (s *SpaceService) ListReadableFavoritedSpaces(ctx context.Context, ids []string, userID string) ([]models.Space, error) {
	if len(ids) == 0 {
		return []models.Space{}, nil
	}

	spaces, err := s.spaceRepo.ListByIDs(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("listing favorited spaces: %w", err)
	}

	var readable []models.Space
	for _, sp := range spaces {
		if err := s.RequireRead(ctx, sp.ID, userID); err != nil {
			continue
		}
		readable = append(readable, sp)
	}
	if readable == nil {
		readable = []models.Space{}
	}
	return readable, nil
}

// GetSpaceByID returns a space by ID.
func (s *SpaceService) GetSpaceByID(ctx context.Context, id string) (models.Space, error) {
	space, err := s.spaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("getting space: %w", err)
	}
	return space, nil
}

// GetSpaceBySlug returns a space by slug with read permission check.
func (s *SpaceService) GetSpaceBySlug(ctx context.Context, slug, userID string) (models.Space, error) {
	space, err := s.spaceRepo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, ErrSpaceNotFound) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("getting space by slug: %w", err)
	}
	if err := s.RequireRead(ctx, space.ID, userID); err != nil {
		return models.Space{}, err
	}
	return space, nil
}

// GetDefaultSpaceID returns the ID of the default space.
func (s *SpaceService) GetDefaultSpaceID(ctx context.Context) (string, error) {
	id, err := s.spaceRepo.GetDefaultSpaceID(ctx)
	if err != nil {
		return "", fmt.Errorf("getting default space id: %w", err)
	}
	return id, nil
}

// --- Role helpers ---

func (s *SpaceService) userGroupIDs(ctx context.Context, userID, workspaceID string) ([]string, error) {
	if s.groupRepo == nil {
		return nil, nil
	}
	return s.groupRepo.ListUserGroupIDsInWorkspace(ctx, userID, workspaceID)
}

func (s *SpaceService) RequireAdmin(ctx context.Context, spaceID, userID string) error {
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("getting space: %w", err)
	}

	// Creator always has admin.
	if space.CreatedBy == userID {
		return nil
	}

	groupIDs, err := s.userGroupIDs(ctx, userID, space.WorkspaceID)
	if err != nil {
		return fmt.Errorf("getting user groups: %w", err)
	}

	role, err := s.spaceRepo.GetEffectiveRole(ctx, spaceID, userID, groupIDs)
	if err != nil {
		return fmt.Errorf("checking effective role: %w", err)
	}
	if role == models.SpaceRoleAdmin {
		return nil
	}
	return ErrSpacePermissionDenied
}

// RequireRead checks if a user has at least reader access to a space.
func (s *SpaceService) RequireRead(ctx context.Context, spaceID, userID string) error {
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("getting space: %w", err)
	}

	// Creator always has access.
	if space.CreatedBy == userID {
		return nil
	}

	groupIDs, err := s.userGroupIDs(ctx, userID, space.WorkspaceID)
	if err != nil {
		return fmt.Errorf("getting user groups: %w", err)
	}

	role, err := s.spaceRepo.GetEffectiveRole(ctx, spaceID, userID, groupIDs)
	if err != nil {
		return fmt.Errorf("checking effective role: %w", err)
	}
	if role == models.SpaceRoleAdmin || role == models.SpaceRoleWriter || role == models.SpaceRoleReader {
		return nil
	}
	return ErrSpacePermissionDenied
}

// --- Membership helpers ---

// GetSpaceMembers returns all members of a space.
func (s *SpaceService) GetSpaceMembers(ctx context.Context, spaceID string) ([]models.SpaceMember, error) {
	return s.spaceRepo.GetMembers(ctx, spaceID)
}

// GetSpaceMemberDetails returns all members of a space enriched with user details.
func (s *SpaceService) GetSpaceMemberDetails(ctx context.Context, spaceID string) ([]models.SpaceMemberWithUser, error) {
	return s.spaceRepo.GetMembersWithUsers(ctx, spaceID)
}

// AddSpaceMember adds a user to a space with a role.
func (s *SpaceService) AddSpaceMember(ctx context.Context, spaceID, userID, role, actorID string) error {
	if role != models.SpaceRoleAdmin && role != models.SpaceRoleWriter && role != models.SpaceRoleReader {
		return fmt.Errorf("invalid role %q: must be admin, writer, or reader", role)
	}
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}
	if err := s.spaceRepo.AddMember(ctx, spaceID, userID, role); err != nil {
		return err
	}
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err == nil {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventSpaceMemberAdded,
			WorkspaceID:  space.WorkspaceID,
			ActorID:      actorID,
			RecipientIDs: []string{userID},
			EntityType:   "space",
			EntityID:     spaceID,
			Metadata:     map[string]string{"name": space.Name},
		})
	}
	return nil
}

// UpdateSpaceMemberRole updates a user's role in a space.
func (s *SpaceService) UpdateSpaceMemberRole(ctx context.Context, spaceID, userID, role, actorID string) error {
	if role != models.SpaceRoleAdmin && role != models.SpaceRoleWriter && role != models.SpaceRoleReader {
		return fmt.Errorf("invalid role %q: must be admin, writer, or reader", role)
	}
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}
	if err := s.spaceRepo.UpdateMemberRole(ctx, spaceID, userID, role); err != nil {
		return err
	}
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err == nil {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventRoleChanged,
			WorkspaceID:  space.WorkspaceID,
			ActorID:      actorID,
			RecipientIDs: []string{userID},
			EntityType:   "space",
			EntityID:     spaceID,
			Metadata:     map[string]string{"role": role, "spaceName": space.Name},
		})
	}
	return nil
}

// RemoveSpaceMember removes a user from a space.
func (s *SpaceService) RemoveSpaceMember(ctx context.Context, spaceID, userID, actorID string) error {
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}
	if err := s.spaceRepo.RemoveMember(ctx, spaceID, userID); err != nil {
		return err
	}
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err == nil {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventSpaceMemberRemoved,
			WorkspaceID:  space.WorkspaceID,
			ActorID:      actorID,
			RecipientIDs: []string{userID},
			EntityType:   "space",
			EntityID:     spaceID,
			Metadata:     map[string]string{"name": space.Name},
		})
	}
	return nil
}

// GetSpaceMembersMixed returns all members of a space as a mixed collection of users and groups.
func (s *SpaceService) GetSpaceMembersMixed(ctx context.Context, spaceID string) ([]models.SpaceMemberMixed, error) {
	return s.spaceRepo.GetMembersMixed(ctx, spaceID)
}

// AddSpaceGroup adds a group to a space with a role. Validates the group belongs to the space's workspace.
func (s *SpaceService) AddSpaceGroup(ctx context.Context, spaceID, groupID, role, actorID string) error {
	if role != models.SpaceRoleAdmin && role != models.SpaceRoleWriter && role != models.SpaceRoleReader {
		return fmt.Errorf("invalid role %q: must be admin, writer, or reader", role)
	}
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}

	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("getting space: %w", err)
	}

	group, err := s.groupRepo.GetByID(ctx, groupID)
	if err != nil {
		if errors.Is(err, repositories.ErrGroupNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("getting group: %w", err)
	}

	if group.WorkspaceID != space.WorkspaceID {
		return fmt.Errorf("group does not belong to this workspace")
	}

	return s.spaceRepo.AddGroupMember(ctx, spaceID, groupID, role)
}

// UpdateSpaceGroupRole updates a group's role in a space.
func (s *SpaceService) UpdateSpaceGroupRole(ctx context.Context, spaceID, groupID, role, actorID string) error {
	if role != models.SpaceRoleAdmin && role != models.SpaceRoleWriter && role != models.SpaceRoleReader {
		return fmt.Errorf("invalid role %q: must be admin, writer, or reader", role)
	}
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}

	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("getting space: %w", err)
	}
	group, err := s.groupRepo.GetByID(ctx, groupID)
	if err != nil {
		if errors.Is(err, repositories.ErrGroupNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("getting group: %w", err)
	}
	if group.WorkspaceID != space.WorkspaceID {
		return fmt.Errorf("group does not belong to this workspace")
	}

	return s.spaceRepo.UpdateGroupMemberRole(ctx, spaceID, groupID, role)
}

// RemoveSpaceGroup removes a group from a space.
func (s *SpaceService) RemoveSpaceGroup(ctx context.Context, spaceID, groupID, actorID string) error {
	if err := s.RequireAdmin(ctx, spaceID, actorID); err != nil {
		return err
	}

	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return fmt.Errorf("getting space: %w", err)
	}
	group, err := s.groupRepo.GetByID(ctx, groupID)
	if err != nil {
		if errors.Is(err, repositories.ErrGroupNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("getting group: %w", err)
	}
	if group.WorkspaceID != space.WorkspaceID {
		return fmt.Errorf("group does not belong to this workspace")
	}

	return s.spaceRepo.RemoveGroupMember(ctx, spaceID, groupID)
}
