package comment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"verso/backy/database/models"
	notifeat "verso/backy/features/notification"
	"verso/backy/repositories"
)

var (
	ErrCommentNotFound     = errors.New("comment not found")
	ErrForbidden           = errors.New("forbidden")
	ErrInvalidParent       = errors.New("parent comment not found or invalid")
	ErrReplyToReply        = errors.New("you cannot reply to a reply")
	ErrCommentResolved     = errors.New("resolved comment cannot be edited")
	ErrCommentsDisabled    = errors.New("comments are disabled for this page")
	ErrMembersOnlyComments = errors.New("only members can comment on this page")
)

type CreateCommentInput struct {
	Content         string  `json:"content"`
	Selection       *string `json:"selection,omitempty"`
	Type            string  `json:"type,omitempty"`
	ParentCommentID *string `json:"parentCommentId,omitempty"`
	GuestName       *string `json:"guestName,omitempty"`
	GuestAvatar     *string `json:"guestAvatar,omitempty"`
}

type UpdateCommentInput struct {
	Content string `json:"content"`
}

type ResolveCommentInput struct {
	Resolved bool `json:"resolved"`
}

type CommentService struct {
	commentRepo   *repositories.CommentRepo
	pageRepo      *repositories.PageRepo
	spaceRepo     *repositories.SpaceRepo
	workspaceRepo *repositories.WorkspaceRepo
	notifier      notifeat.Notifier
	hub           *CommentHub
	pageShareRepo *repositories.PageShareRepo
}

func NewCommentService(
	commentRepo *repositories.CommentRepo,
	pageRepo *repositories.PageRepo,
	spaceRepo *repositories.SpaceRepo,
	notifier notifeat.Notifier,
	hub *CommentHub,
) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		pageRepo:    pageRepo,
		spaceRepo:   spaceRepo,
		notifier:    notifier,
		hub:         hub,
	}
}

func (s *CommentService) SetPageShareRepo(repo *repositories.PageShareRepo) {
	s.pageShareRepo = repo
}

func (s *CommentService) SetWorkspaceRepo(repo *repositories.WorkspaceRepo) {
	s.workspaceRepo = repo
}

func (s *CommentService) IsPageShared(ctx context.Context, pageID string) bool {
	if s.pageShareRepo == nil {
		return false
	}
	share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
	if err != nil {
		return false
	}
	return share.IsEnabled
}

func (s *CommentService) isUserMember(ctx context.Context, workspaceID, spaceID, userID string) bool {
	if userID == "" || userID == "guest" {
		return false
	}
	if s.workspaceRepo != nil {
		isMember, err := s.workspaceRepo.IsMember(ctx, workspaceID, userID)
		if err == nil && isMember {
			return true
		}
	}
	if s.spaceRepo != nil {
		isMember, err := s.spaceRepo.IsMember(ctx, spaceID, userID)
		if err == nil && isMember {
			return true
		}
	}
	return false
}

func (s *CommentService) canUserAccessPage(ctx context.Context, page models.Page, userID string) bool {
	if s.IsPageShared(ctx, page.ID) {
		return true
	}
	return s.isUserMember(ctx, page.WorkspaceID, page.SpaceID, userID)
}

// CreateComment creates a top-level comment or a thread reply.
func (s *CommentService) CreateComment(ctx context.Context, pageID string, creatorID string, input CreateCommentInput) (*models.CommentWithDetails, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return nil, fmt.Errorf("fetching page: %w", err)
	}

	if s.pageShareRepo != nil {
		share, err := s.pageShareRepo.GetByPageID(ctx, pageID)
		if err == nil {
			if share.CommentAccess == "disabled" {
				return nil, ErrCommentsDisabled
			}
			if share.CommentAccess == "members" && !s.isUserMember(ctx, page.WorkspaceID, page.SpaceID, creatorID) {
				return nil, ErrMembersOnlyComments
			}
		}
	}

	if input.ParentCommentID != nil && *input.ParentCommentID != "" {
		parent, err := s.commentRepo.GetByID(ctx, *input.ParentCommentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrInvalidParent
			}
			return nil, fmt.Errorf("checking parent comment: %w", err)
		}
		if parent.PageID != pageID {
			return nil, ErrInvalidParent
		}
		if parent.ParentCommentID != nil {
			return nil, ErrReplyToReply
		}
	}

	commentType := input.Type
	if commentType == "" {
		commentType = "page"
	}

	var selection *string
	if input.Selection != nil && *input.Selection != "" {
		sel := *input.Selection
		if len(sel) > 250 {
			sel = sel[:250]
		}
		selection = &sel
	}

	now := time.Now().UTC()
	commentID := uuid.New().String()

	c := models.Comment{
		ID:              commentID,
		WorkspaceID:     page.WorkspaceID,
		SpaceID:         page.SpaceID,
		PageID:          page.ID,
		CreatorID:       creatorID,
		ParentCommentID: input.ParentCommentID,
		Content:         input.Content,
		Selection:       selection,
		Type:            commentType,
		GuestName:       input.GuestName,
		GuestAvatar:     input.GuestAvatar,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	created, err := s.commentRepo.Insert(ctx, c)
	if err != nil {
		return nil, fmt.Errorf("creating comment: %w", err)
	}

	// Publish real-time WS event
	if s.hub != nil {
		s.hub.Publish(page.ID, CommentEvent{
			Operation: "commentCreated",
			PageID:    page.ID,
			CommentID: created.ID,
			Comment:   created,
		})
	}

	// Queue Notifications
	go s.notifyCommentAction(context.Background(), page, created, input.ParentCommentID)

	return created, nil
}

// ListComments retrieves all comments for a page.
func (s *CommentService) ListComments(ctx context.Context, pageID string) ([]models.CommentWithDetails, error) {
	return s.commentRepo.ListByPageID(ctx, pageID)
}

// GetComment retrieves a single comment by ID after verifying authorization to the containing page.
func (s *CommentService) GetComment(ctx context.Context, commentID string, userID string) (*models.CommentWithDetails, error) {
	c, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCommentNotFound
		}
		return nil, err
	}

	page, err := s.pageRepo.GetByID(ctx, c.PageID)
	if err != nil {
		return nil, ErrCommentNotFound
	}

	if !s.canUserAccessPage(ctx, page, userID) {
		return nil, ErrForbidden
	}

	return c, nil
}

// UpdateComment edits a comment's content.
func (s *CommentService) UpdateComment(ctx context.Context, commentID string, userID string, input UpdateCommentInput) (*models.CommentWithDetails, error) {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCommentNotFound
		}
		return nil, err
	}

	if comment.CreatorID != userID {
		return nil, ErrForbidden
	}

	if comment.ResolvedAt != nil {
		return nil, ErrCommentResolved
	}

	if comment.ParentCommentID != nil && *comment.ParentCommentID != "" {
		parent, err := s.commentRepo.GetByID(ctx, *comment.ParentCommentID)
		if err == nil && parent != nil && parent.ResolvedAt != nil {
			return nil, ErrCommentResolved
		}
	}

	now := time.Now().UTC()
	updated, err := s.commentRepo.Update(ctx, commentID, input.Content, now)
	if err != nil {
		return nil, fmt.Errorf("updating comment: %w", err)
	}

	if s.hub != nil {
		s.hub.Publish(comment.PageID, CommentEvent{
			Operation: "commentUpdated",
			PageID:    comment.PageID,
			CommentID: updated.ID,
			Comment:   updated,
		})
	}

	return updated, nil
}

// DeleteComment deletes a comment and its replies.
func (s *CommentService) DeleteComment(ctx context.Context, commentID string, userID string, isAdmin bool) error {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCommentNotFound
		}
		return err
	}

	if comment.CreatorID != userID && !isAdmin {
		return ErrForbidden
	}

	if err := s.commentRepo.Delete(ctx, commentID); err != nil {
		return fmt.Errorf("deleting comment: %w", err)
	}

	if s.hub != nil {
		s.hub.Publish(comment.PageID, CommentEvent{
			Operation: "commentDeleted",
			PageID:    comment.PageID,
			CommentID: commentID,
		})
	}

	return nil
}

// ToggleResolve resolves or re-opens a comment thread (only page owner allowed).
func (s *CommentService) ToggleResolve(ctx context.Context, commentID string, userID string, input ResolveCommentInput) (*models.CommentWithDetails, error) {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCommentNotFound
		}
		return nil, err
	}

	page, err := s.pageRepo.GetByID(ctx, comment.PageID)
	if err != nil {
		return nil, fmt.Errorf("fetching page for resolve check: %w", err)
	}

	if userID == "" || userID != page.CreatorID {
		return nil, ErrForbidden
	}

	updated, err := s.commentRepo.ToggleResolve(ctx, commentID, input.Resolved, userID)
	if err != nil {
		return nil, fmt.Errorf("toggling resolve: %w", err)
	}

	if s.hub != nil {
		s.hub.Publish(comment.PageID, CommentEvent{
			Operation: "commentResolved",
			PageID:    comment.PageID,
			CommentID: updated.ID,
			Comment:   updated,
		})
	}

	// Notify original creator if resolved by another user
	if input.Resolved && comment.CreatorID != userID {
		page, pageErr := s.pageRepo.GetByID(ctx, comment.PageID)
		if pageErr == nil {
			s.notifier.Notify(ctx, notifeat.NotificationEvent{
				Type:         notifeat.EventCommentResolved,
				WorkspaceID:  comment.WorkspaceID,
				ActorID:      userID,
				RecipientIDs: []string{comment.CreatorID},
				EntityType:   "comment",
				EntityID:     comment.ID,
				Metadata: map[string]string{
					"pageId":    page.ID,
					"pageTitle": page.Title,
					"commentId": comment.ID,
				},
			})
		}
	}

	return updated, nil
}

// notifyCommentAction sends notifications for mentions and replies.
func (s *CommentService) notifyCommentAction(ctx context.Context, page models.Page, comment *models.CommentWithDetails, parentCommentID *string) {
	recipients := make(map[string]struct{})

	actorName := comment.Creator.Name
	if actorName == "" {
		actorName = "Someone"
	}

	// Handle Thread Reply Notification
	if parentCommentID != nil && *parentCommentID != "" {
		parent, err := s.commentRepo.GetByID(ctx, *parentCommentID)
		if err == nil && parent != nil && parent.CreatorID != comment.CreatorID && parent.CreatorID != "" && parent.CreatorID != "guest" {
			s.notifier.Notify(ctx, notifeat.NotificationEvent{
				Type:         notifeat.EventCommentReply,
				WorkspaceID:  page.WorkspaceID,
				ActorID:      comment.CreatorID,
				RecipientIDs: []string{parent.CreatorID},
				EntityType:   "comment",
				EntityID:     comment.ID,
				Metadata: map[string]string{
					"pageId":      page.ID,
					"pageTitle":   page.Title,
					"commentId":   comment.ID,
					"actorName":   actorName,
					"actorAvatar": comment.Creator.AvatarURL,
					"commentText": comment.Content,
					"parentText":  parent.Content,
				},
			})
			recipients[parent.CreatorID] = struct{}{}
		}
	}

	// Handle Page Owner Notification
	if page.CreatorID != "" && page.CreatorID != comment.CreatorID {
		if _, alreadyNotified := recipients[page.CreatorID]; !alreadyNotified {
			s.notifier.Notify(ctx, notifeat.NotificationEvent{
				Type:         notifeat.EventCommentCreated,
				WorkspaceID:  page.WorkspaceID,
				ActorID:      comment.CreatorID,
				RecipientIDs: []string{page.CreatorID},
				EntityType:   "comment",
				EntityID:     comment.ID,
				Metadata: map[string]string{
					"pageId":      page.ID,
					"pageTitle":   page.Title,
					"commentId":   comment.ID,
					"actorName":   actorName,
					"actorAvatar": comment.Creator.AvatarURL,
					"commentText": comment.Content,
				},
			})
			recipients[page.CreatorID] = struct{}{}
		}
	}

	// Handle Mentions
	mentionedIDs := extractMentionIDs(comment.Content)
	var filteredMentions []string
	for _, id := range mentionedIDs {
		if id != comment.CreatorID {
			if _, alreadyNotified := recipients[id]; !alreadyNotified {
				if s.canUserAccessPage(ctx, page, id) {
					filteredMentions = append(filteredMentions, id)
				}
			}
		}
	}

	if len(filteredMentions) > 0 {
		s.notifier.Notify(ctx, notifeat.NotificationEvent{
			Type:         notifeat.EventCommentMention,
			WorkspaceID:  page.WorkspaceID,
			ActorID:      comment.CreatorID,
			RecipientIDs: filteredMentions,
			EntityType:   "comment",
			EntityID:     comment.ID,
			Metadata: map[string]string{
				"pageId":      page.ID,
				"pageTitle":   page.Title,
				"commentId":   comment.ID,
				"actorName":   actorName,
				"actorAvatar": comment.Creator.AvatarURL,
				"commentText": comment.Content,
			},
		})
	}
}

var uuidRegex = regexp.MustCompile(`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`)

// extractMentionIDs parses content for mentioned user UUIDs
func extractMentionIDs(content string) []string {
	var ids []string
	seen := make(map[string]bool)

	// Try JSON parsing
	var jsonMap map[string]any
	if err := json.Unmarshal([]byte(content), &jsonMap); err == nil {
		findMentionsInMap(jsonMap, seen, &ids)
		return ids
	}

	// Fallback to regex pattern matching for UUIDs
	matches := uuidRegex.FindAllString(content, -1)
	for _, match := range matches {
		if !seen[match] {
			seen[match] = true
			ids = append(ids, match)
		}
	}

	return ids
}

func findMentionsInMap(node map[string]any, seen map[string]bool, ids *[]string) {
	if nodeType, ok := node["type"].(string); ok && nodeType == "mention" {
		if attrs, ok := node["attrs"].(map[string]any); ok {
			if id, ok := attrs["id"].(string); ok && id != "" {
				if !seen[id] {
					seen[id] = true
					*ids = append(*ids, id)
				}
			}
		}
	}

	if content, ok := node["content"].([]any); ok {
		for _, child := range content {
			if childMap, ok := child.(map[string]any); ok {
				findMentionsInMap(childMap, seen, ids)
			}
		}
	}
}
