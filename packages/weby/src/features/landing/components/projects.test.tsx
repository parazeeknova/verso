import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "#/shared/types";
import { MobileProjectList } from "./projects";
import { useProjects } from "../hooks/use-data";

// Mock the useProjects hook
vi.mock("../hooks/use-data", () => ({
  useProjects: vi.fn(),
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
        target: HTMLElement | HTMLElement[] | Element[] | null,
        _from: Record<string, unknown>,
        to: Record<string, unknown>,
      ) => {
        let elements: (HTMLElement | Element)[] = [];
        if (Array.isArray(target)) {
          elements = target;
        } else if (target) {
          elements = [target];
        }

        for (const el of elements) {
          if (el && "style" in el) {
            if (typeof to.onStart === "function") {
              to.onStart();
            }
            const { duration: _d, ease: _e, onComplete, onStart: _s, ...styles } = to;
            applyStyles(el as HTMLElement, styles);
            if (typeof onComplete === "function") {
              onComplete();
            }
          }
        }
        return mockTimeline;
      },
      killTweensOf: () => {},
      set: (el: HTMLElement | null, props: Record<string, unknown>) => {
        if (el) {
          applyStyles(el, props);
        }
      },
      timeline: () => mockTimeline,
      to: (
        target: HTMLElement | HTMLElement[] | Element[] | null,
        props: Record<string, unknown>,
      ) => {
        let elements: (HTMLElement | Element)[] = [];
        if (Array.isArray(target)) {
          elements = target;
        } else if (target) {
          elements = [target];
        }

        for (const el of elements) {
          if (el && "style" in el) {
            if (typeof props.onStart === "function") {
              props.onStart();
            }
            const { duration: _d, ease: _e, onComplete, onStart: _s, ...styles } = props;
            applyStyles(el as HTMLElement, styles);
            if (typeof onComplete === "function") {
              onComplete();
            }
          }
        }
        return mockTimeline;
      },
    },
  };
});

describe("MobileProjectList", () => {
  const mockProjects: Project[] = [
    { desc: "Desc 1", stack: "react", title: "Project 1" },
    { desc: "Desc 2", stack: "go", title: "Project 2" },
    { desc: "Desc 3", stack: "rust", title: "Project 3" },
    { desc: "Desc 4", stack: "python", title: "Project 4" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isPending: true,
    } as unknown as ReturnType<typeof useProjects>);
    render(<MobileProjectList />);
    // Should render loading dots
    const loading = document.querySelector(".shrink-0");
    expect(loading).toBeDefined();
  });

  it("renders first 3 items and shows expand option when there are more items", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isPending: false,
    } as unknown as ReturnType<typeof useProjects>);
    const { container } = render(<MobileProjectList />);

    // First 3 projects should be rendered
    expect(screen.getByText("Project 1")).toBeDefined();
    expect(screen.getByText("Project 2")).toBeDefined();
    expect(screen.getByText("Project 3")).toBeDefined();

    // The extra projects container should be collapsed initially (height: 0, opacity: 0)
    const extraContainer = container.querySelector(".overflow-hidden") as HTMLDivElement;
    expect(extraContainer?.style.height).toBe("0px");
    expect(extraContainer?.style.opacity).toBe("0");

    // The see more button should be present
    const toggleButton = screen.getByRole("button", { name: /see more/i });
    expect(toggleButton).toBeDefined();
  });

  it("can expand and collapse extra items smoothly", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isPending: false,
    } as unknown as ReturnType<typeof useProjects>);
    const { container } = render(<MobileProjectList />);

    const toggleButton = screen.getByRole("button", { name: /see more/i });
    const extraContainer = container.querySelector(".overflow-hidden") as HTMLDivElement;

    // Click to expand
    fireEvent.click(toggleButton);

    // Style checks for expanded state
    expect(screen.getByRole("button", { name: /view less/i })).toBeDefined();
    expect(extraContainer?.style.height).toBe("auto");
    expect(extraContainer?.style.opacity).toBe("1");

    // Click to collapse
    const collapseButton = screen.getByRole("button", { name: /view less/i });
    fireEvent.click(collapseButton);

    // Style checks for collapsed state again
    expect(extraContainer?.style.height).toBe("0px");
    expect(extraContainer?.style.opacity).toBe("0");
  });

  it("returns null when there are no projects", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useProjects>);
    const { container } = render(<MobileProjectList />);
    expect(container.innerHTML).toBe("");
  });
});
