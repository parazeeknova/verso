import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../test/utils";
import { useAuth, useAuthActions } from "./use-auth";

const createMockResponse = (data: unknown, ok = true, status = 200): Response => {
  const body = JSON.stringify(data);
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    json: () => Promise.resolve(data),
    ok,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
};

describe("useAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when not authenticated", async () => {
    const mockFetch = vi
      .fn()
      // useAuth calls fetchProtected which hits /api/auth/me
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // fetchProtected sees 401, calls refreshTokens → /api/auth/refresh
      .mockResolvedValueOnce(createMockResponse({}, false, 401));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const mockUser = {
      email: "test@example.com",
      id: "1",
      isOwner: true,
      username: "testuser",
    };

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockUser));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUser);
  });
});

describe("useAuthActions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("login calls correct endpoint", async () => {
    const mockUser = { email: "test@example.com", id: "1", isOwner: true, username: "testuser" };
    const mockFetch = vi
      .fn()
      // initial useAuth query → /api/auth/me 401
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // 401 triggers refresh → /api/auth/refresh 401 (fails)
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // login POST
      .mockResolvedValueOnce(createMockResponse(mockUser))
      // refetch after login → /api/auth/me 200
      .mockResolvedValueOnce(createMockResponse(mockUser));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => ({ actions: useAuthActions(), auth: useAuth() }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.auth.isSuccess).toBe(true);
    });

    await result.current.actions.login("testuser", "password123");

    const loginCall = mockFetch.mock.calls.find((call: unknown[]) => call[0] === "/api/auth/login");
    expect(loginCall).toBeDefined();

    const init = loginCall?.[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({ password: "password123", usernameOrEmail: "testuser" });
  });

  it("login with email bootstraps when no users exist", async () => {
    const mockUser = { email: "new@example.com", id: "1", isOwner: true, username: "newuser" };
    const mockFetch = vi
      .fn()
      // initial useAuth query → /api/auth/me 401
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // 401 triggers refresh → /api/auth/refresh 401 (fails)
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // login POST (with email triggers bootstrap)
      .mockResolvedValueOnce(createMockResponse(mockUser))
      // refetch after login → /api/auth/me 200
      .mockResolvedValueOnce(createMockResponse(mockUser));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => ({ actions: useAuthActions(), auth: useAuth() }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.auth.isSuccess).toBe(true);
    });

    await result.current.actions.login("newuser", "password123", "new@example.com");

    const loginCall = mockFetch.mock.calls.find((call: unknown[]) => call[0] === "/api/auth/login");
    expect(loginCall).toBeDefined();

    const init = loginCall?.[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      email: "new@example.com",
      password: "password123",
      usernameOrEmail: "newuser",
    });
  });

  it("login throws on error response", async () => {
    const errorResponse = createMockResponse({ error: "Invalid credentials" }, false, 401);
    const mockFetch = vi
      .fn()
      // initial useAuth query → /api/auth/me 401
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // 401 triggers refresh → /api/auth/refresh 401 (fails)
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // login POST → error
      .mockResolvedValueOnce(errorResponse);
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => ({ actions: useAuthActions(), auth: useAuth() }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.auth.isSuccess).toBe(true);
    });

    await expect(result.current.actions.login("testuser", "wrong")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("logout clears auth data", async () => {
    const mockUser = { email: "test@example.com", id: "1", isOwner: true, username: "testuser" };
    const mockFetch = vi
      .fn()
      // initial useAuth query → /api/auth/me 200
      .mockResolvedValueOnce(createMockResponse(mockUser))
      // logout POST
      .mockResolvedValueOnce(createMockResponse({}))
      // refetch after logout → /api/auth/me 401
      .mockResolvedValueOnce(createMockResponse({}, false, 401))
      // 401 triggers refresh → /api/auth/refresh 401 (fails)
      .mockResolvedValueOnce(createMockResponse({}, false, 401));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => ({ actions: useAuthActions(), auth: useAuth() }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.auth.isSuccess).toBe(true);
    });
    expect(result.current.auth.data).toEqual(mockUser);

    await result.current.actions.logout();

    await waitFor(() => {
      expect(result.current.auth.data).toBeNull();
    });
  });
});
