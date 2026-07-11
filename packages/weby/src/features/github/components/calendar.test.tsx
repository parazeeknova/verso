import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubActivity } from "./calendar";

// Mock the react-github-calendar package to avoid rendering the actual complex SVG calendar
vi.mock("react-github-calendar", () => ({
  GitHubCalendar: () => <div data-testid="github-calendar">Mock Calendar</div>,
}));

// Mock react-tooltip
vi.mock("react-tooltip", () => ({
  Tooltip: () => <div data-testid="github-tooltip">Mock Tooltip</div>,
}));

describe("GitHubActivity", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders expanded by default", () => {
    render(<GitHubActivity username="testuser" />);

    // Heading should be rendered
    expect(screen.getByText("activity overview")).toBeDefined();

    // Calendar should be visible
    expect(screen.getByTestId("github-calendar")).toBeDefined();
  });

  it("can be collapsed and expanded by clicking the toggle button", () => {
    render(
      <GitHubActivity username="testuser">
        <div data-testid="child-stats">Mock Stats</div>
      </GitHubActivity>,
    );

    const toggleButton = screen.getByRole("button", { name: /activity overview/i });
    expect(screen.getByTestId("github-calendar")).toBeDefined();
    expect(screen.getByTestId("child-stats")).toBeDefined();

    // Click to collapse
    fireEvent.click(toggleButton);

    // Calendar and stats should be hidden
    expect(screen.queryByTestId("github-calendar")).toBeNull();
    expect(screen.queryByTestId("child-stats")).toBeNull();
    expect(localStorage.getItem("github-activity-collapsed")).toBe("true");

    // Click to expand
    fireEvent.click(toggleButton);

    // Calendar and stats should be visible again
    expect(screen.getByTestId("github-calendar")).toBeDefined();
    expect(screen.getByTestId("child-stats")).toBeDefined();
    expect(localStorage.getItem("github-activity-collapsed")).toBe("false");
  });

  it("restores collapsed state from localStorage on mount", () => {
    localStorage.setItem("github-activity-collapsed", "true");

    render(<GitHubActivity username="testuser" />);

    // Calendar should be collapsed initially
    expect(screen.queryByTestId("github-calendar")).toBeNull();
  });
});
