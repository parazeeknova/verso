import { createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "#/shared/test/utils";
import { usePageTree } from "./use-pages";

const createMockResponse = (data: unknown, ok = true, status = 200): Response => {
  const body = JSON.stringify(data);
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    ok,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
};

describe("usePageTree", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes empty parentPageId values to null", async () => {
    const mockItems = [
      {
        createdAt: "2026-05-01T00:00:00Z",
        hasChildren: false,
        icon: "",
        id: "root-page",
        isPublished: false,
        parentPageId: "",
        position: "",
        slugId: "root-page",
        spaceId: "space-1",
        title: "Root Page",
        updatedAt: "2026-05-01T00:00:00Z",
      },
    ];

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createMockResponse(mockItems)));

    const { result } = renderHook(() => usePageTree("space-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        ...mockItems[0],
        parentPageId: null,
      },
    ]);
  });

  it("normalizes missing parentPageId values to null", async () => {
    const mockItems = [
      {
        createdAt: "2026-05-01T00:00:00Z",
        hasChildren: false,
        icon: "",
        id: "root-page",
        isPublished: false,
        position: "",
        slugId: "root-page",
        spaceId: "space-1",
        title: "Root Page",
        updatedAt: "2026-05-01T00:00:00Z",
      },
    ];

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createMockResponse(mockItems)));

    const { result } = renderHook(() => usePageTree("space-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0]?.parentPageId).toBeNull();
  });
});

describe("useUpdatePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("optimistically updates page details cached by spaceId and slugId", async () => {
    const { useUpdatePage, usePageBySpaceAndSlug } = await import("./use-pages");
    const { createTestQueryClient } = await import("#/shared/test/utils");
    const { QueryClientProvider } = await import("@tanstack/react-query");

    const initialPage = {
      contentJson: "{}",
      createdAt: "2026-05-01T00:00:00Z",
      creatorId: "user-1",
      editable: true,
      id: "page-123",
      isLocked: false,
      isPublished: false,
      slugId: "my-slug",
      spaceId: "space-abc",
      title: "Test Page",
      updatedAt: "2026-05-01T00:00:00Z",
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(initialPage)));

    const testQueryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: testQueryClient }, children);

    const { result: pageQuery } = renderHook(() => usePageBySpaceAndSlug("space-abc", "my-slug"), {
      wrapper,
    });

    await waitFor(() => {
      expect(pageQuery.current.isSuccess).toBe(true);
    });

    expect(pageQuery.current.data?.isLocked).toBe(false);

    // Mock unresolved fetch to test optimistic update state before resolution
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.race([])),
    );

    const { result: mutation } = renderHook(() => useUpdatePage(), { wrapper });

    act(() => {
      mutation.current.mutate({
        id: "page-123",
        input: { isLocked: true },
      });
    });

    await waitFor(() => {
      expect(pageQuery.current.data?.isLocked).toBe(true);
    });
  });

  it("restores per-query snapshot on rollback when mutation fails", async () => {
    const { useUpdatePage } = await import("./use-pages");
    const { createTestQueryClient } = await import("#/shared/test/utils");
    const { QueryClientProvider } = await import("@tanstack/react-query");

    const queryByIdData = {
      contentJson: "{}",
      createdAt: "2026-05-01T00:00:00Z",
      creatorId: "user-1",
      editable: true,
      id: "page-123",
      isLocked: false,
      isPublished: false,
      slugId: "my-slug",
      spaceId: "space-abc",
      title: "Title By ID",
      updatedAt: "2026-05-01T00:00:00Z",
    };

    const queryBySlugData = {
      ...queryByIdData,
      title: "Title By Slug Newer",
    };

    const testQueryClient = createTestQueryClient();
    testQueryClient.setQueryDefaults(["consolePage"], { gcTime: 10_000 });
    testQueryClient.setQueryData(["consolePage", "page-123"], queryByIdData);
    testQueryClient.setQueryData(["consolePage", "space-abc", "my-slug"], queryBySlugData);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: testQueryClient }, children);

    const { result: mutation } = renderHook(() => useUpdatePage(), { wrapper });

    act(() => {
      mutation.current.mutate({
        id: "page-123",
        input: { title: "Mutated Title" },
      });
    });

    await waitFor(() => {
      expect(mutation.current.isError).toBe(true);
    });

    expect(testQueryClient.getQueryData(["consolePage", "page-123"])).toEqual(queryByIdData);
    expect(testQueryClient.getQueryData(["consolePage", "space-abc", "my-slug"])).toEqual(
      queryBySlugData,
    );
  });
});
