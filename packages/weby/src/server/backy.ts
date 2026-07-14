import type {
  AuthUser,
  BlogManifestSection,
  BlogPost,
  BootstrapState,
  ConsolePage,
  ConsolePageDetail,
  ConsoleUser,
  CreatePageInput,
  ExperienceItem,
  Group,
  GroupMember,
  MovePageInput,
  NotificationItem,
  PageHistoryItem,
  PageTreeItem,
  Profile,
  Project,
  PushSubscriptionPayload,
  RestorePageInput,
  Space,
  SpaceMemberWithUser,
  Stats,
  UpdatePageInput,
  Workspace,
} from "#/shared/types";
import { logger } from "#/shared/lib/logger";

const getBackyOrigin = (): string => {
  const origin = process.env.BACKY_ORIGIN;
  if (origin && origin.trim().length > 0) {
    return origin.endsWith("/") ? origin : `${origin}/`;
  }
  return "http://localhost:7000/";
};

export class BackyError extends Error {
  body: string;
  ok = false as const;
  status: number;

  constructor(status: number, body: string) {
    super(`Backy HTTP ${status}`);
    this.body = body;
    this.name = "BackyError";
    this.status = status;
  }
}

const fetchBacky = async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
  const origin = getBackyOrigin();
  const url = new URL(`api/${endpoint}`, origin).toString();

  // Normalize headers via the Headers API to handle all HeadersInit shapes
  // (plain object, Headers instance, [string,string][]).
  const normalized = new Headers(init?.headers);
  normalized.set("Accept", "application/json");

  const { headers: _, ...restInit } = init ?? {};
  const mergedInit: RequestInit = {
    ...restInit,
    headers: normalized,
  };

  const start = Date.now();
  const method = mergedInit.method ?? "GET";
  const response = await fetch(url, mergedInit);
  const latency = Date.now() - start;

  logger[response.ok ? "info" : "warn"](
    { endpoint, latencyMs: latency, method, status: response.status },
    "backy request",
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ body, endpoint, method, status: response.status }, "backy request failed");
    throw new BackyError(response.status, body);
  }

  return response.json() as Promise<T>;
};

const buildBackyUrl = (endpoint: string): string => {
  const origin = getBackyOrigin();
  return new URL(`api/${endpoint}`, origin).toString();
};

export const getProfile = () => fetchBacky<Profile>("profile");

export const getExperience = () => fetchBacky<ExperienceItem[]>("experience");

export const getProjects = () => fetchBacky<Project[]>("projects");

export const getGitHubStats = () => fetchBacky<unknown>("github/stats");

export const getBlogPost = (slug: string) => fetchBacky<BlogPost>(`blogs/${slug}`);

export const getBlogManifest = () => fetchBacky<BlogManifestSection[]>("blogs");

export const getBootstrapState = () => fetchBacky<BootstrapState>("auth/bootstrap-state");

export const getStats = () => fetchBacky<Stats>("stats");

export const getAuthMe = (cookieHeader?: string | null) =>
  fetchBacky<AuthUser>("auth/me", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getBacky = (endpoint: string, cookieHeader?: string | null): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return fetch(url, { headers });
};

export const postBacky = (endpoint: string, body: unknown): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  return fetch(url, {
    body: JSON.stringify(body),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
};

export const postBackyWithCookies = (
  endpoint: string,
  body: unknown,
  cookieHeader?: string | null,
): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return fetch(url, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  });
};

export const putBackyWithCookies = (
  endpoint: string,
  body: unknown,
  cookieHeader?: string | null,
): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return fetch(url, {
    body: JSON.stringify(body),
    headers,
    method: "PUT",
  });
};

export const deleteBackyWithCookies = (
  endpoint: string,
  cookieHeader?: string | null,
): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return fetch(url, {
    headers,
    method: "DELETE",
  });
};

export const getConsolePages = (cookieHeader?: string | null) =>
  fetchBacky<ConsolePage[]>("console/pages", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<ConsolePageDetail>(`console/pages/${encodeURIComponent(id)}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

// Console page mutations
export const createConsolePage = (input: CreatePageInput, cookieHeader?: string | null) =>
  fetchBacky<ConsolePageDetail>("console/pages", {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const updateConsolePage = (
  id: string,
  input: UpdatePageInput,
  cookieHeader?: string | null,
) =>
  fetchBacky<ConsolePageDetail>(`console/pages/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/pages/${encodeURIComponent(id)}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const publishConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; isPublished: boolean; updatedAt: string }>(
    `console/pages/${encodeURIComponent(id)}/publish`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

export const unpublishConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; isPublished: boolean; updatedAt: string }>(
    `console/pages/${encodeURIComponent(id)}/unpublish`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

export const getPageBySpaceAndSlug = (
  spaceId: string,
  slugId: string,
  cookieHeader?: string | null,
) =>
  fetchBacky<ConsolePageDetail>(
    `console/spaces/${encodeURIComponent(spaceId)}/pages/by-slug/${encodeURIComponent(slugId)}`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    },
  );

export const getPageTree = (spaceId: string, cookieHeader?: string | null) =>
  fetchBacky<PageTreeItem[]>(
    spaceId ? `console/pages/tree?spaceId=${encodeURIComponent(spaceId)}` : "console/pages/tree",
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    },
  );

export const getPageChildren = (id: string, cookieHeader?: string | null) =>
  fetchBacky<PageTreeItem[]>(`console/pages/${encodeURIComponent(id)}/children`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const movePage = (id: string, input: MovePageInput, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; position: string; parentPageId: string | null; updatedAt: string }>(
    `console/pages/${encodeURIComponent(id)}/move`,
    {
      body: JSON.stringify(input),
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );

export const getPageHistory = (id: string, cookieHeader?: string | null) =>
  fetchBacky<PageHistoryItem[]>(`console/pages/${encodeURIComponent(id)}/history`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getPageHistoryEntry = (id: string, historyId: string, cookieHeader?: string | null) =>
  fetchBacky<PageHistoryItem>(
    `console/pages/${encodeURIComponent(id)}/history/${encodeURIComponent(historyId)}`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    },
  );

export const restorePage = (id: string, input: RestorePageInput, cookieHeader?: string | null) =>
  fetchBacky<ConsolePageDetail>(`console/pages/${encodeURIComponent(id)}/restore`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const watchConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ watching: boolean }>(`console/pages/${encodeURIComponent(id)}/watch`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "POST",
  });

export const getPageWatchStatus = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ watching: boolean }>(`console/pages/${encodeURIComponent(id)}/watching`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

// Space functions
export const getSpaces = (workspaceId?: string | null, cookieHeader?: string | null) => {
  const url = workspaceId
    ? `console/spaces?workspaceId=${encodeURIComponent(workspaceId)}`
    : "console/spaces";
  return fetchBacky<Space[]>(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
};

export const getSpaceBySlug = (slug: string, cookieHeader?: string | null) =>
  fetchBacky<Space>(`console/spaces/by-slug/${encodeURIComponent(slug)}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getSpaceById = (id: string, cookieHeader?: string | null) =>
  fetchBacky<Space>(`console/spaces/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const createSpace = (
  input: { name: string; slug: string; icon?: string; description?: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<Space>("console/spaces", {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const updateSpace = (
  id: string,
  input: {
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    headerImage?: string;
    visibility?: string;
    defaultRole?: string;
  },
  cookieHeader?: string | null,
) =>
  fetchBacky<Space>(`console/spaces/${id}`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteSpace = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/spaces/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const getSpaceMembers = (id: string, cookieHeader?: string | null) =>
  fetchBacky<SpaceMemberWithUser[]>(`console/spaces/${id}/members`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const addSpaceMember = (
  spaceId: string,
  userId: string,
  role: string,
  cookieHeader?: string | null,
) =>
  fetchBacky<{ status: string }>(`console/spaces/${spaceId}/members/${userId}`, {
    body: JSON.stringify({ role }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const updateSpaceMemberRole = (
  spaceId: string,
  userId: string,
  role: string,
  cookieHeader?: string | null,
) =>
  fetchBacky<{ status: string }>(`console/spaces/${spaceId}/members/${userId}`, {
    body: JSON.stringify({ role }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const removeSpaceMember = (spaceId: string, userId: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/spaces/${spaceId}/members/${userId}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Workspace functions
export const getWorkspaces = (cookieHeader?: string | null) =>
  fetchBacky<Workspace[]>("console/workspaces", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const createWorkspace = (
  input: { name: string; slug: string; icon?: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<Workspace>("console/workspaces", {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const updateWorkspace = (
  id: string,
  input: { name: string; slug: string; icon?: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<Workspace>(`console/workspaces/${id}`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteWorkspace = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/workspaces/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Debug functions
export const getDebugTables = (cookieHeader?: string | null) =>
  fetchBacky<{ tables: string[] }>("console/debug/tables", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export interface DebugStorageOrphanBucketReport {
  bucket: string;
  orphanObjectCount: number;
  orphanSample: string[];
  referencedCount: number;
  totalObjectCount: number;
}

export interface DebugStorageOrphanReport {
  buckets: DebugStorageOrphanBucketReport[];
  generatedAtUtc: string;
  totalBuckets: number;
  totalObjectCount: number;
  totalOrphanCount: number;
  totalReferenceSet: number;
}

export interface DebugStorageObjectItem {
  bucket: string;
  key: string;
}

export interface DebugStorageBucketObjects {
  bucket: string;
  objectCount: number;
  objects: DebugStorageObjectItem[];
}

export interface DebugStorageObjectsResponse {
  buckets: DebugStorageBucketObjects[];
  generatedAtUtc: string;
  totalBucketCount: number;
  totalObjectCount: number;
}

export const getDebugStorageOrphans = (cookieHeader?: string | null) =>
  fetchBacky<DebugStorageOrphanReport>("console/debug/storage/orphans", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getDebugStorageObjects = (cookieHeader?: string | null) =>
  fetchBacky<DebugStorageObjectsResponse>("console/debug/storage/objects", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getDebugTableData = (tableName: string, cookieHeader?: string | null) =>
  fetchBacky<{ columns: { name: string; type: string }[]; rows: Record<string, unknown>[] }>(
    `console/debug/tables/${tableName}`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    },
  );

export const deleteDebugTableData = (tableName: string, cookieHeader?: string | null) =>
  fetchBacky<{ deleted: number; table: string }>(`console/debug/tables/${tableName}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const deleteDebugTableRows = (
  tableName: string,
  ids: string[],
  cookieHeader?: string | null,
) =>
  fetchBacky<{ deleted: number; table: string }>(`console/debug/tables/${tableName}/rows`, {
    body: JSON.stringify({ ids }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

// Profile functions
export const getUserProfile = (cookieHeader?: string | null) =>
  fetchBacky<AuthUser>("console/profile", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const updateProfile = (
  input: { name: string; avatar_url: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<{ status: string }>("console/profile", {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const changePassword = (
  input: { current_password: string; new_password: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<{ status: string }>("console/profile/password", {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const getSessionInfo = (cookieHeader?: string | null) =>
  fetchBacky<{ device_name: string; last_seen_at: string }>("console/profile/session", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const revokeSession = (cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>("console/profile/session/revoke", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "POST",
  });

// User management functions
export const getUsers = (cookieHeader?: string | null) =>
  fetchBacky<ConsoleUser[]>("console/users", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getUserById = (id: string, cookieHeader?: string | null) =>
  fetchBacky<ConsoleUser>(`console/users/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const updateUserRole = (id: string, role: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/users/${id}/role`, {
    body: JSON.stringify({ role }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const updateUserActive = (id: string, isActive: boolean, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/users/${id}/active`, {
    body: JSON.stringify({ is_active: isActive }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteUser = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/users/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Group functions
export const getGroups = (workspaceId: string, cookieHeader?: string | null) =>
  fetchBacky<{ groups: Group[] }>(`console/workspaces/${workspaceId}/groups`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const createGroup = (
  workspaceId: string,
  input: { name: string; description?: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<Group>(`console/workspaces/${workspaceId}/groups`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const updateGroup = (
  id: string,
  input: { name?: string; description?: string },
  cookieHeader?: string | null,
) =>
  fetchBacky<Group>(`console/groups/${id}`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteGroup = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/groups/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const getGroupMembers = (id: string, cookieHeader?: string | null) =>
  fetchBacky<GroupMember[]>(`console/groups/${id}/members`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const addGroupMember = (id: string, userId: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/groups/${id}/members`, {
    body: JSON.stringify({ userId }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const removeGroupMember = (groupId: string, userId: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/groups/${groupId}/members/${userId}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Notification functions
export const getNotifications = (cookieHeader?: string | null) =>
  fetchBacky<NotificationItem[]>("console/notifications", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getUnreadNotificationCount = (cookieHeader?: string | null) =>
  fetchBacky<{ count: number }>("console/notifications/unread-count", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const markNotificationRead = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/notifications/${id}/read`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "PUT",
  });

export const markAllNotificationsRead = (cookieHeader?: string | null) =>
  fetchBacky<{ status: string; count: number }>("console/notifications/read-all", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "PUT",
  });

export const dismissNotification = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/notifications/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const dismissAllNotifications = (cookieHeader?: string | null) =>
  fetchBacky<{ count: number }>("console/notifications/dismiss-all", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Push subscription functions
export const getVapidPublicKey = (cookieHeader?: string | null) =>
  fetchBacky<{ publicKey: string }>("console/push/public-key", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const subscribePush = (payload: PushSubscriptionPayload, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>("console/push/subscribe", {
    body: JSON.stringify(payload),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

export const unsubscribePush = (endpoint: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>("console/push/unsubscribe", {
    body: JSON.stringify({ endpoint }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "DELETE",
  });

// System settings functions
export interface SystemSettingItem {
  key: string;
  updatedAt: string;
  updatedBy?: string;
  value: boolean;
}

export const getSystemSettings = (cookieHeader?: string | null) =>
  fetchBacky<{ settings: SystemSettingItem[] }>("console/system-settings", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const updateSystemSetting = (key: string, value: boolean, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>("console/system-settings", {
    body: JSON.stringify({ key, value }),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

export const uploadBacky = (
  endpoint: string,
  formData: FormData,
  cookieHeader?: string | null,
): Promise<Response> => {
  const url = buildBackyUrl(endpoint);
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return fetch(url, {
    body: formData,
    headers,
    method: "POST",
  });
};
