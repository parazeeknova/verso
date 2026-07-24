import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "#/shared/test/utils";
import { useExperience, useIsFetchingData, useProfile, useProjects } from "./use-data";

// Helper to create mock Response at module level
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

describe("useProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches profile data successfully and caches in localStorage", async () => {
    const mockProfile = {
      description: "test description",
      links: {
        portfolio: { label: "Portfolio", url: "https://example.com" },
      },
      name: "Test User",
      tagline: "test tagline",
    };

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProfile));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    // Cold start is pending
    expect(result.current.isPending).toBe(true);

    // Wait for fetched data
    await waitFor(() => {
      expect(result.current.data).toEqual(mockProfile);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/profile", expect.any(Object));
    expect(localStorage.getItem("verso_cache_profile")).toContain("Test User");
  });

  it("restores cached profile data from localStorage instantly on warm start", () => {
    const cachedProfile = {
      description: "cached description",
      links: {},
      name: "Cached User",
      tagline: "cached tagline",
    };
    localStorage.setItem("verso_cache_profile", JSON.stringify(cachedProfile));

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse(cachedProfile));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    // Warm start has data instantly from placeholderData
    expect(result.current.data).toEqual(cachedProfile);
  });

  it("handles fetch error", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse({}, false));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("throws error on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({}),
      ok: false,
      status: 404,
    } as Response);
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain("404");
  });
});

describe("useExperience", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("fetches experience data successfully and saves to localStorage", async () => {
    const mockExperience = [
      {
        location: "Remote",
        period: "2024-Present",
        title: "Test Job",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockExperience));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useExperience(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockExperience);
    });

    expect(localStorage.getItem("verso_cache_experience")).toContain("Test Job");
  });
});

describe("useProjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("fetches projects data successfully and saves to localStorage", async () => {
    const mockProjects = [
      {
        desc: "Test description",
        stack: "React, TypeScript",
        title: "Test Project",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProjects));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockProjects);
    });

    expect(localStorage.getItem("verso_cache_projects")).toContain("Test Project");
  });
});

describe("useIsFetchingData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("returns true when cold starting without cache", () => {
    // Create a deferred promise that never resolves
    let resolvePromise: ((value: unknown) => void) | undefined;
    // eslint-disable-next-line promise/avoid-new
    const deferredPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const mockFetch = vi.fn().mockReturnValue(deferredPromise);
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useIsFetchingData(), {
      wrapper: createWrapper(),
    });

    // Should be true while loading cold
    expect(result.current).toBe(true);

    // Clean up by resolving (avoid unhandled promise)
    if (resolvePromise) {
      resolvePromise({ json: () => Promise.resolve({}), ok: true });
    }
  });
});
