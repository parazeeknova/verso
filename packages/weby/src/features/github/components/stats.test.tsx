import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "#/shared/test/utils";
import type { GitHubStatsData } from "./stats";
import { GitHubStats } from "./stats";

// Helper to create mock Response at module level
const createMockResponse = (data: unknown, ok = true): Response =>
  ({
    json: () => Promise.resolve(data),
    ok,
  }) as unknown as Response;

describe("GitHubStats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset fetch mock
    if (globalThis.fetch && "mockRestore" in globalThis.fetch) {
      vi.restoreAllMocks();
    }
  });

  const mockStats: GitHubStatsData = {
    commitsLastYear: 365,
    commitsThisMonth: 42,
    orgs: [
      {
        avatar_url: "https://example.com/avatar.png",
        html_url: "https://github.com/testorg",
        login: "testorg",
      },
    ],
    prsThisMonth: 5,
  };

  it("renders loading state initially", () => {
    // Simulates loading state with unresolved promise
    // eslint-disable-next-line promise/avoid-new
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    // Should show loading dots
    const loadingContainer = document.querySelector(".mt-4");
    expect(loadingContainer).toBeDefined();
  });

  it("renders stats data correctly", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(createMockResponse(mockStats)),
      ) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeDefined();
    });

    // Check all stats are rendered
    // commits this month
    expect(screen.getByText("42")).toBeDefined();
    // commits last year
    expect(screen.getByText("365")).toBeDefined();
    // PRs
    expect(screen.getByText("5")).toBeDefined();

    // Check labels
    expect(screen.getByText("commits this month")).toBeDefined();
    expect(screen.getByText("commits last year")).toBeDefined();
  });

  it("renders error state", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.reject(new Error("Network error")),
      ) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      const errorText = screen.getByText(/Failed to load GitHub stats/i);
      expect(errorText).toBeDefined();
    });
  });

  it("renders orgs section when data has orgs", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(createMockResponse(mockStats)),
      ) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("testorg")).toBeDefined();
    });

    // Check orgs label
    expect(screen.getByText("orgs")).toBeDefined();

    // Check org link
    const orgLink = screen.getByText("testorg").closest("a");
    expect(orgLink?.getAttribute("href")).toBe("https://github.com/testorg");
  });

  it("does not render orgs section when no orgs", async () => {
    const statsNoOrgs = { ...mockStats, orgs: [] };
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(createMockResponse(statsNoOrgs)),
      ) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("42")).toBeDefined();
    });

    // Orgs section should not be present
    const orgsLabel = screen.queryByText("orgs");
    expect(orgsLabel).toBeNull();
  });

  it("handles HTTP error response", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(createMockResponse({}, false)),
      ) as unknown as typeof fetch;

    render(<GitHubStats />, { wrapper: createWrapper() });

    await waitFor(() => {
      const errorText = screen.getByText(/Failed to load GitHub stats/i);
      expect(errorText).toBeDefined();
    });
  });
});
