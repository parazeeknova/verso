export interface Link {
  label: string;
  url: string;
}

export interface Profile {
  description: string;
  email?: string;
  links: Record<string, Link>;
  name: string;
  tagline: string;
  username?: string;
}

export interface ExperienceItem {
  location: string;
  period: string;
  title: string;
}

export interface Project {
  desc: string;
  productUrl?: string;
  readmeUrl?: string;
  repoUrl?: string;
  stack: string;
  title: string;
}

export interface BlogHeading {
  id: string;
  label: string;
  level: number;
}

export interface BlogManifestSection {
  label: string;
  children: BlogManifestPost[];
}

export interface BlogManifestPost {
  slug: string;
  title: string;
  section: string;
}

export interface BlogPost {
  description: string;
  headings?: BlogHeading[];
  publishedAt: string;
  readTimeMinutes: number;
  section: string;
  slug: string;
  tags: string[];
  title: string;
  content?: Record<string, unknown>;
  icon?: string;
  coverPhoto?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  isOwner: boolean;
}

export interface ConsoleUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  is_active: boolean;
  last_seen: string;
  createdAt: string;
}

export interface BootstrapState {
  bootstrapped: boolean;
}

export interface Stats {
  pages: number;
  posts: number;
  readmes: number;
}

export interface ConsolePage {
  id: string;
  slugId: string;
  title: string;
  icon: string;
  isPublished: boolean;
  spaceId: string;
  parentPageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsolePageDetail {
  id: string;
  slugId: string;
  title: string;
  icon: string;
  coverPhoto: string;
  contentJson: string;
  textContent: string;
  position: string;
  isPublished: boolean;
  parentPageId: string | null;
  spaceId: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  isLocked: boolean;
}

export interface PageWatchStatus {
  watching: boolean;
}

export interface PageTreeItem {
  id: string;
  slugId: string;
  title: string;
  icon: string;
  position: string;
  isPublished: boolean;
  parentPageId: string | null;
  spaceId: string;
  hasChildren: boolean;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageHistoryItem {
  id: string;
  pageId: string;
  title: string;
  contentJson: string;
  textContent: string;
  operation: string;
  createdById: string;
  createdAt: string;
}

export interface CreatePageInput {
  slugId: string;
  title: string;
  icon?: string;
  spaceId?: string;
  workspaceId?: string;
  parentPageId?: string;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string;
  coverPhoto?: string;
  contentJson?: string;
  textContent?: string;
  isLocked?: boolean;
}

export interface MovePageInput {
  parentPageId?: string | null;
  position?: string;
}

export interface RestorePageInput {
  historyId: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  headerImage: string;
  workspaceId: string;
  createdBy?: string;
  visibility: string;
  defaultRole: string;
  settings: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMemberWithUser {
  id: string;
  user_id: string;
  space_id: string;
  role: string;
  joined_at: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface SpaceMemberMixed {
  memberType: "user" | "group";
  id: string;
  userId?: string;
  groupId?: string;
  spaceId: string;
  role: string;
  joinedAt: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  description?: string;
  memberCount?: number;
  isDefault?: boolean;
}

export interface Group {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  isDefault: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  name: string;
  email: string;
  avatar_url: string;
  added_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  settings: string;
  defaultSpaceId?: string;
  enforceMfa: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  workspaceId?: string;
  recipientUserId: string;
  actorUserId?: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  metadata: string;
  readAt: string | null;
  createdAt: string;
  actorName?: string;
  actorAvatarUrl?: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}
