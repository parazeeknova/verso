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
  isOwner: boolean;
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
  createdAt: string;
  updatedAt: string;
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
  spaceId: string;
  parentPageId?: string;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string;
  coverPhoto?: string;
  contentJson?: string;
  textContent?: string;
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
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}
