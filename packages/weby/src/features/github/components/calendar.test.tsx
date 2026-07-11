import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubActivity } from "./calendar";

// Mock the react-github-calendar package to avoid rendering the actual complex SVG calendar
vi.mock("react-github-calendar", () => ({
  GitHubCalendar: () => (
    <div className="github-calendar-svg" data-testid="github-calendar">
      Mock Calendar
    </div>
  ),
}));

// Mock react-tooltip
vi.mock("react-tooltip", () => ({
  Tooltip: () => <div data-testid="github-tooltip">Mock Tooltip</div>,
}));

// Mock GSAP to run animations synchronously in JSDOM
vi.mock("gsap", () => {
  const mockTimeline = {
    fromTo: () => mockTimeline,
    play: () => {},
    reverse: () => {},
    to: () => mockTimeline,
  };
  const unitlessKeys = new Set(["opacity", "zIndex", "flexGrow", "flexShrink"]);
  const applyStyles = (el: HTMLElement, props: Record<string, unknown>) => {
    const styleObj = el.style as unknown as Record<string, string>;
    for (const [key, val] of Object.entries(props)) {
      styleObj[key] = typeof val === "number" && !unitlessKeys.has(key) ? `${val}px` : String(val);
    }
  };

  return {
    gsap: {
      fromTo: (
        el: HTMLElement | null,
        _from: Record<string, unknown>,
        to: Record<string, unknown>,
      ) => {
        if (el) {
          if (typeof to.onStart === "function") {
            to.onStart();
          }
          const { duration: _d, ease: _e, onComplete, onStart: _s, ...styles } = to;
          applyStyles(el, styles);
          if (typeof onComplete === "function") {
            onComplete();
          }
        }
        return mockTimeline;
      },
      set: (el: HTMLElement | null, props: Record<string, unknown>) => {
        if (el) {
          applyStyles(el, props);
        }
      },
      timeline: () => mockTimeline,
      to: (el: HTMLElement | null, props: Record<string, unknown>) => {
        if (el) {
          if (typeof props.onStart === "function") {
            props.onStart();
          }
          const { duration: _d, ease: _e, onComplete, onStart: _s, ...styles } = props;
          applyStyles(el, styles);
          if (typeof onComplete === "function") {
            onComplete();
          }
        }
        return mockTimeline;
      },
    },
  };
});

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
    const { container } = render(
      <GitHubActivity username="testuser">
        <div data-testid="child-stats">Mock Stats</div>
      </GitHubActivity>,
    );

    const toggleButton = screen.getByRole("button", { name: /activity overview/i });
    const contentContainer = container.querySelector(".github-calendar-svg")?.parentElement;

    // Click to collapse
    fireEvent.click(toggleButton);

    // Style checks for collapsed state
    expect(contentContainer?.style.height).toBe("0px");
    expect(contentContainer?.style.opacity).toBe("0");
    expect(localStorage.getItem("github-activity-collapsed")).toBe("true");

    // Click to expand
    fireEvent.click(toggleButton);

    // Style checks for expanded state
    expect(contentContainer?.style.height).toBe("auto");
    expect(contentContainer?.style.opacity).toBe("1");
    expect(localStorage.getItem("github-activity-collapsed")).toBe("false");
  });

  it("restores collapsed state from localStorage on mount", () => {
    localStorage.setItem("github-activity-collapsed", "true");

    const { container } = render(<GitHubActivity username="testuser" />);
    const contentContainer = container.querySelector(".github-calendar-svg")?.parentElement;

    // Calendar should be styled collapsed initially
    expect(contentContainer?.style.height).toBe("0px");
    expect(contentContainer?.style.opacity).toBe("0");
  });
});
