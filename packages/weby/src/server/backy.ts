import type {
  AuthUser,
  BlogManifestSection,
  BlogPost,
  BootstrapState,
  ConsolePage,
  ConsolePageDetail,
  CreatePageInput,
  ExperienceItem,
  MovePageInput,
  PageHistoryItem,
  PageTreeItem,
  Profile,
  Project,
  RestorePageInput,
  Space,
  Stats,
  UpdatePageInput,
  Workspace,
} from "#/types";
import { logger } from "#/lib/logger";

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

export const getConsolePages = (cookieHeader?: string | null) =>
  fetchBacky<ConsolePage[]>("console/pages", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<ConsolePageDetail>(`console/pages/${id}`, {
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
  fetchBacky<ConsolePageDetail>(`console/pages/${id}`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

export const deleteConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/pages/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

export const publishConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; isPublished: boolean; updatedAt: string }>(
    `console/pages/${id}/publish`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

export const unpublishConsolePage = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; isPublished: boolean; updatedAt: string }>(
    `console/pages/${id}/unpublish`,
    {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

export const getPageTree = (cookieHeader?: string | null) =>
  fetchBacky<PageTreeItem[]>("console/pages/tree", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getPageChildren = (id: string, cookieHeader?: string | null) =>
  fetchBacky<PageTreeItem[]>(`console/pages/${id}/children`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const movePage = (id: string, input: MovePageInput, cookieHeader?: string | null) =>
  fetchBacky<{ id: string; position: string; parentPageId: string | null; updatedAt: string }>(
    `console/pages/${id}/move`,
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
  fetchBacky<PageHistoryItem[]>(`console/pages/${id}/history`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const getPageHistoryEntry = (id: string, historyId: string, cookieHeader?: string | null) =>
  fetchBacky<PageHistoryItem>(`console/pages/${id}/history/${historyId}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const restorePage = (id: string, input: RestorePageInput, cookieHeader?: string | null) =>
  fetchBacky<ConsolePageDetail>(`console/pages/${id}/restore`, {
    body: JSON.stringify(input),
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

// Space functions
export const getSpaces = (cookieHeader?: string | null) =>
  fetchBacky<Space[]>("console/spaces", {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

export const createSpace = (
  input: { name: string; slug: string; icon?: string },
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

export const deleteSpace = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/spaces/${id}`, {
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

export const deleteWorkspace = (id: string, cookieHeader?: string | null) =>
  fetchBacky<{ status: string }>(`console/workspaces/${id}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    method: "DELETE",
  });

// Debug functions
export const getDebugTables = (cookieHeader?: string | null) =>
  fetchBacky<string[]>("console/debug/tables", {
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
