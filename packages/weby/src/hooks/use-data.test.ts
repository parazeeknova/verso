import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../test/utils";
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches profile data successfully", async () => {
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

    // Initially loading
    expect(result.current.isPending).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProfile);
    expect(mockFetch).toHaveBeenCalledWith("/api/profile", expect.any(Object));
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
  });

  it("fetches experience data successfully", async () => {
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
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockExperience);
  });
});

describe("useProjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches projects data successfully", async () => {
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
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProjects);
  });
});

describe("useIsFetchingData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns true when any query is pending", () => {
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

    // Should be true while loading
    expect(result.current).toBe(true);

    // Clean up by resolving (avoid unhandled promise)
    if (resolvePromise) {
      resolvePromise({ json: () => Promise.resolve({}), ok: true });
    }
  });
});
