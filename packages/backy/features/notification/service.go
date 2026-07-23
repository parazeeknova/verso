package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/google/uuid"

	"verso/backy/database/models"
	"verso/backy/repositories"
	"verso/backy/shared/logger"
)

// NotificationService creates persistent notification rows and delivers browser push.
type NotificationService struct {
	notifRepo   *repositories.NotificationRepo
	pushSubRepo *repositories.PushSubscriptionRepo
	userRepo    *repositories.UserRepo
	hub         *NotificationHub
}

// NewNotificationService creates a new notification service.
func NewNotificationService(notifRepo *repositories.NotificationRepo, pushSubRepo *repositories.PushSubscriptionRepo, userRepo *repositories.UserRepo) *NotificationService {
	return &NotificationService{
		notifRepo:   notifRepo,
		pushSubRepo: pushSubRepo,
		userRepo:    userRepo,
	}
}

// SetHub sets the notification hub for SSE streaming.
func (s *NotificationService) SetHub(hub *NotificationHub) {
	s.hub = hub
}

// Notify implements the Notifier interface. Creates persistent notification rows
// and triggers browser push delivery asynchronously.
func (s *NotificationService) Notify(ctx context.Context, event NotificationEvent) {
	title, body := s.generateText(event)

	bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, recipientID := range event.RecipientIDs {

		metadataJSON := "{}"
		if len(event.Metadata) > 0 {
			b, err := json.Marshal(event.Metadata)
			if err == nil {
				metadataJSON = string(b)
			}
		}

		var actorUserID *string
		if event.ActorID != "" && event.ActorID != "guest" {
			actorUserID = &event.ActorID
		}

		n := models.Notification{
			ID:              uuid.New().String(),
			RecipientUserID: recipientID,
			ActorUserID:     actorUserID,
			Type:            string(event.Type),
			Title:           title,
			Body:            body,
			EntityType:      event.EntityType,
			EntityID:        event.EntityID,
			Metadata:        metadataJSON,
			CreatedAt:       time.Now().UTC(),
		}
		if event.WorkspaceID != "" {
			n.WorkspaceID = &event.WorkspaceID
		}

		if err := s.notifRepo.Insert(bgCtx, n); err != nil {
			logger.Log.Error().Err(err).
				Str("recipient", recipientID).
				Str("type", string(event.Type)).
				Msg("failed to create notification")
			continue
		}

		// Broadcast via SSE hub so connected clients get real-time delivery.
		if s.hub != nil {
			actorName := ""
			actorAvatar := ""
			if event.ActorID != "" && event.ActorID != "guest" {
				if actor, err := s.userRepo.FindMetaByID(bgCtx, event.ActorID); err == nil && actor != nil {
					actorName = actor.Name
					actorAvatar = actor.AvatarURL
				}
			}
			if actorName == "" {
				if name, ok := event.Metadata["actorName"]; ok {
					actorName = name
				}
			}
			if actorAvatar == "" {
				if avatar, ok := event.Metadata["actorAvatar"]; ok {
					actorAvatar = avatar
				}
			}
			s.hub.Publish(recipientID, models.NotificationWithActor{
				ID:              n.ID,
				WorkspaceID:     n.WorkspaceID,
				RecipientUserID: n.RecipientUserID,
				ActorUserID:     n.ActorUserID,
				Type:            n.Type,
				Title:           n.Title,
				Body:            n.Body,
				EntityType:      n.EntityType,
				EntityID:        n.EntityID,
				Metadata:        n.Metadata,
				ReadAt:          nil,
				CreatedAt:       n.CreatedAt,
				ActorName:       actorName,
				ActorAvatarURL:  actorAvatar,
			})
		}

		go s.deliverPush(bgCtx, recipientID, n)
	}
}

// CountUnread returns the number of unread notifications for a user.
func (s *NotificationService) CountUnread(ctx context.Context, userID string) (int, error) {
	return s.notifRepo.CountUnread(ctx, userID)
}

// GetNotifications returns recent notifications for a user.
func (s *NotificationService) GetNotifications(ctx context.Context, userID string, limit int) ([]models.NotificationWithActor, error) {
	return s.notifRepo.ListByRecipient(ctx, userID, limit)
}

// MarkRead marks a single notification as read.
func (s *NotificationService) MarkRead(ctx context.Context, id, userID string) error {
	return s.notifRepo.MarkRead(ctx, id, userID)
}

// MarkAllRead marks all notifications as read for a user.
func (s *NotificationService) MarkAllRead(ctx context.Context, userID string) (int, error) {
	return s.notifRepo.MarkAllRead(ctx, userID)
}

// Dismiss soft-deletes a single notification.
func (s *NotificationService) Dismiss(ctx context.Context, id, userID string) error {
	return s.notifRepo.SoftDelete(ctx, id, userID)
}

// DismissAll soft-deletes all notifications for a user.
func (s *NotificationService) DismissAll(ctx context.Context, userID string) (int, error) {
	return s.notifRepo.SoftDeleteAll(ctx, userID)
}

// UpsertPushSubscription saves or updates a browser push subscription.
func (s *NotificationService) UpsertPushSubscription(ctx context.Context, sub models.PushSubscription) error {
	return s.pushSubRepo.Upsert(ctx, sub)
}

// DeletePushSubscription removes a browser push subscription.
func (s *NotificationService) DeletePushSubscription(ctx context.Context, userID, endpoint string) error {
	return s.pushSubRepo.DeleteByUserAndEndpoint(ctx, userID, endpoint)
}

// GetVAPIDPublicKey returns the VAPID public key used for push subscription generation.
func (s *NotificationService) GetVAPIDPublicKey() string {
	return os.Getenv("VAPID_PUBLIC_KEY")
}

// generateText produces server-side title and body text for each event type.
func (s *NotificationService) generateText(event NotificationEvent) (string, string) {
	switch event.Type {
	case EventWorkspaceRenamed:
		name := s.metadataStr(event.Metadata, "name", "the workspace")
		return "Workspace renamed", fmt.Sprintf("The workspace was renamed to %q.", name)
	case EventWorkspaceDeleted:
		name := s.metadataStr(event.Metadata, "name", "a workspace")
		return "Workspace deleted", fmt.Sprintf("The workspace %q was deleted.", name)
	case EventWorkspaceIconChanged:
		name := s.metadataStr(event.Metadata, "name", "the workspace")
		return "Workspace icon updated", fmt.Sprintf("The icon for %q was changed.", name)
	case EventSpaceCreated:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Space created", fmt.Sprintf("A new space %q was created.", name)
	case EventSpaceRenamed:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Space renamed", fmt.Sprintf("A space was renamed to %q.", name)
	case EventSpaceIconChanged:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Space icon updated", fmt.Sprintf("The icon for space %q was changed.", name)
	case EventSpaceHeaderImageChanged:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Space header updated", fmt.Sprintf("The header image for space %q was changed.", name)
	case EventGroupMemberAdded:
		group := s.metadataStr(event.Metadata, "groupName", "a group")
		return "Added to group", fmt.Sprintf("You were added to the group %q.", group)
	case EventGroupMemberRemoved:
		group := s.metadataStr(event.Metadata, "groupName", "a group")
		return "Removed from group", fmt.Sprintf("You were removed from the group %q.", group)
	case EventRoleChanged:
		role := s.metadataStr(event.Metadata, "role", "member")
		spaceName := s.metadataStr(event.Metadata, "spaceName", "a space")
		return "Role changed", fmt.Sprintf("Your role in %q was changed to %q.", spaceName, role)
	case EventPageUpdated:
		name := s.metadataStr(event.Metadata, "name", "a page")
		return "Page updated", fmt.Sprintf("The page %q was updated.", name)
	case EventPageCreated:
		name := s.metadataStr(event.Metadata, "name", "a page")
		if event.Metadata["isFolder"] == "true" {
			return "Folder created", fmt.Sprintf("A new folder %q was created.", name)
		}
		return "Page created", fmt.Sprintf("A new page %q was created.", name)
	case EventPageDeleted:
		name := s.metadataStr(event.Metadata, "name", "a page")
		return "Page deleted", fmt.Sprintf("The page %q was deleted.", name)
	case EventWorkspaceMemberAdded:
		wsName := s.metadataStr(event.Metadata, "name", "a workspace")
		return "Added to workspace", fmt.Sprintf("You were added to the workspace %q.", wsName)
	case EventSpaceMemberAdded:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Added to space", fmt.Sprintf("You were added to the space %q.", name)
	case EventSpaceMemberRemoved:
		name := s.metadataStr(event.Metadata, "name", "a space")
		return "Removed from space", fmt.Sprintf("You were removed from the space %q.", name)
	case EventProfileAvatarUpdated:
		return "Avatar updated", "Your profile avatar was updated."
	case EventProfileNameChanged:
		// Actor receives their own notification, so "Your" is appropriate.
		newName := s.metadataStr(event.Metadata, "newName", "a new name")
		return "Name updated", fmt.Sprintf("Your display name was changed to %q.", newName)
	case EventProfilePasswordChanged:
		return "Password changed", "Your account password was changed."
	case EventProfileMFAEnabled:
		return "2FA enabled", "Two-factor authentication has been enabled on your account."
	case EventProfileMFADisabled:
		return "2FA disabled", "Two-factor authentication has been disabled on your account."
	case EventCommentCreated:
		actorName := s.metadataStr(event.Metadata, "actorName", "Someone")
		pageTitle := s.metadataStr(event.Metadata, "pageTitle", "your page")
		commentText := s.metadataStr(event.Metadata, "commentText", "a comment")
		commentText = truncateRunes(commentText, 40)
		return fmt.Sprintf("Comment on %s", pageTitle), fmt.Sprintf("%s commented %q on your %s page", actorName, commentText, pageTitle)
	case EventCommentReply:
		actorName := s.metadataStr(event.Metadata, "actorName", "Someone")
		pageTitle := s.metadataStr(event.Metadata, "pageTitle", "a page")
		commentText := s.metadataStr(event.Metadata, "commentText", "a comment")
		commentText = truncateRunes(commentText, 30)
		parentText := s.metadataStr(event.Metadata, "parentText", "")
		if parentText != "" {
			parentText = truncateRunes(parentText, 25)
			return fmt.Sprintf("Reply on %s", pageTitle), fmt.Sprintf("%s replied %q to your comment %q on %s", actorName, commentText, parentText, pageTitle)
		}
		return fmt.Sprintf("Reply on %s", pageTitle), fmt.Sprintf("%s replied %q to your comment on %s", actorName, commentText, pageTitle)
	case EventCommentMention:
		pageTitle := s.metadataStr(event.Metadata, "pageTitle", "a page")
		return "Mentioned in comment", fmt.Sprintf("You were mentioned in a comment on %q.", pageTitle)
	case EventCommentResolved:
		pageTitle := s.metadataStr(event.Metadata, "pageTitle", "a page")
		return "Comment resolved", fmt.Sprintf("Your comment on %q was resolved.", pageTitle)
	default:
		return "Notification", "You have a new notification."
	}
}

func truncateRunes(s string, maxRunes int) string {
	runes := []rune(s)
	if len(runes) > maxRunes {
		return string(runes[:maxRunes]) + "..."
	}
	return s
}

func (s *NotificationService) metadataStr(meta map[string]string, key, fallback string) string {
	if v, ok := meta[key]; ok && v != "" {
		return v
	}
	return fallback
}

// deliverPush attempts to send a browser push notification to all of a user's subscriptions.
// Runs asynchronously; cleans up subscriptions that have become invalid.
func (s *NotificationService) deliverPush(ctx context.Context, userID string, notif models.Notification) {
	subs, err := s.pushSubRepo.ListByUser(ctx, userID)
	if err != nil {
		logger.Log.Error().Err(err).Str("user_id", userID).Msg("failed to list push subscriptions")
		return
	}
	if len(subs) == 0 {
		return
	}

	vapidPrivateKey := os.Getenv("VAPID_PRIVATE_KEY")
	vapidPublicKey := os.Getenv("VAPID_PUBLIC_KEY")
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@verso.local"
	}
	if vapidPrivateKey == "" || vapidPublicKey == "" {
		logger.Log.Warn().Msg("VAPID keys not configured; skipping browser push delivery")
		return
	}

	payload := map[string]string{
		"title": notif.Title,
		"body":  notif.Body,
		"type":  notif.Type,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		logger.Log.Error().Err(err).Msg("failed to marshal push payload")
		return
	}

	for _, sub := range subs {
		wpSub := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256DH,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(payloadBytes, wpSub, &webpush.Options{
			Subscriber:      vapidSubject,
			VAPIDPublicKey:  vapidPublicKey,
			VAPIDPrivateKey: vapidPrivateKey,
			TTL:             86400,
		})
		if err != nil {
			logger.Log.Warn().Err(err).Str("user_id", userID).Msg("browser push delivery failed")
			if resp != nil && (resp.StatusCode == 404 || resp.StatusCode == 410) {
				if delErr := s.pushSubRepo.DeleteByEndpoint(ctx, sub.Endpoint); delErr != nil {
					logger.Log.Error().Err(delErr).Msg("failed to clean up invalid push subscription")
				}
			}
		}
		if resp != nil {
			_ = resp.Body.Close()
		}
	}
}
