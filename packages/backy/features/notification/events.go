package notification

import "context"

// NotificationEventType identifies the kind of notification.
type NotificationEventType string

const (
	EventWorkspaceRenamed        NotificationEventType = "workspace.renamed"
	EventWorkspaceDeleted        NotificationEventType = "workspace.deleted"
	EventWorkspaceIconChanged    NotificationEventType = "workspace.icon_changed"
	EventSpaceCreated            NotificationEventType = "space.created"
	EventSpaceRenamed            NotificationEventType = "space.renamed"
	EventSpaceIconChanged        NotificationEventType = "space.icon_changed"
	EventSpaceHeaderImageChanged NotificationEventType = "space.header_image_changed"
	EventGroupMemberAdded        NotificationEventType = "group.member_added"
	EventGroupMemberRemoved      NotificationEventType = "group.member_removed"
	EventRoleChanged             NotificationEventType = "role.changed"
	EventPageUpdated             NotificationEventType = "page.updated"
	EventPageCreated             NotificationEventType = "page.created"
	EventPageDeleted             NotificationEventType = "page.deleted"
	EventWorkspaceMemberAdded    NotificationEventType = "workspace.member_added"
	EventSpaceMemberAdded        NotificationEventType = "space.member_added"
	EventSpaceMemberRemoved      NotificationEventType = "space.member_removed"
	EventProfileAvatarUpdated    NotificationEventType = "profile.avatar_updated"
	EventProfileNameChanged      NotificationEventType = "profile.name_changed"
	EventProfilePasswordChanged  NotificationEventType = "profile.password_changed"
	EventProfileMFAEnabled       NotificationEventType = "profile.mfa_enabled"
	EventProfileMFADisabled      NotificationEventType = "profile.mfa_disabled"
	EventCommentReply            NotificationEventType = "comment.reply"
	EventCommentCreated          NotificationEventType = "comment.created"
	EventCommentMention          NotificationEventType = "comment.mention"
	EventCommentResolved         NotificationEventType = "comment.resolved"
)

// NotificationEvent carries all data needed to create and deliver a notification.
type NotificationEvent struct {
	Type         NotificationEventType
	WorkspaceID  string
	ActorID      string
	RecipientIDs []string
	EntityType   string
	EntityID     string
	Metadata     map[string]string
}

// Notifier is the interface that domain services call to emit notification events.
type Notifier interface {
	Notify(ctx context.Context, event NotificationEvent)
}

// noopNotifier is used when notification service is not available.
type noopNotifier struct{}

func (n *noopNotifier) Notify(ctx context.Context, event NotificationEvent) {}

// NoopNotifier returns a notifier that does nothing.
func NoopNotifier() Notifier {
	return &noopNotifier{}
}
