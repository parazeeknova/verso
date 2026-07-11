import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExperienceItem, Profile } from "#/shared/types";
import { ExperienceSection, ProfileSection, SocialLinks } from "./sections";

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

describe("ProfileSection", () => {
  const mockProfile: Profile = {
    description: "Test description about the user.",
    links: {
      github: { label: "GitHub", url: "https://github.com/testuser" },
      linkedin: { label: "LinkedIn", url: "https://linkedin.com/in/test" },
      portfolio: { label: "Portfolio", url: "https://example.com" },
      singularity: { label: "Singularity", url: "https://singularity.test" },
      twitter: { label: "X", url: "https://x.com/test" },
      zephyr: { label: "Zephyr", url: "https://zephyr.test" },
    },
    name: "Test User",
    tagline: "test tagline",
  };

  it("renders profile name", () => {
    render(<ProfileSection profile={mockProfile} isMobile={false} isPending={false} />);
    expect(screen.getByText("Test User")).toBeDefined();
  });

  it("hides name when profile is undefined", () => {
    render(<ProfileSection profile={undefined} isMobile={false} isPending={false} />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders portfolio link", () => {
    render(<ProfileSection profile={mockProfile} isMobile={false} isPending={false} />);
    const link = screen.getByText(
      (c, el) => c.includes("Portfolio") && el?.tagName.toLowerCase() === "a",
    );
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("https://example.com");
  });
});

describe("ExperienceSection", () => {
  const mockExperience: ExperienceItem[] = [
    {
      location: "Remote",
      period: "2020-Present",
      title: "Software Engineer",
    },
  ];

  it("renders experience items", () => {
    render(<ExperienceSection experience={mockExperience} isPending={false} />);
    expect(screen.getByText("Software Engineer")).toBeDefined();
    expect(screen.getByText("Remote | 2020-Present")).toBeDefined();
  });

  it("returns null when no experience", () => {
    const { container } = render(<ExperienceSection experience={[]} isPending={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders loading state", () => {
    render(<ExperienceSection experience={undefined} isPending={true} />);
    const container = document.querySelector(".shrink-0");
    expect(container).toBeDefined();
  });

  it("can expand and collapse extra items smoothly", () => {
    const mockFullExperience: ExperienceItem[] = [
      { location: "Remote", period: "2020-Present", title: "Software Engineer" },
      { location: "Remote", period: "2018-2020", title: "Frontend Developer" },
      { location: "Remote", period: "2016-2018", title: "Junior Engineer" },
      { location: "Remote", period: "2014-2016", title: "Intern" },
    ];

    const { container } = render(
      <ExperienceSection experience={mockFullExperience} isPending={false} />,
    );

    // Find the see more button
    const toggleButton = screen.getByRole("button", { name: /see more/i });
    expect(toggleButton).toBeDefined();

    // The extra items wrapper should be collapsed initially (height: 0, opacity: 0)
    const extraContainer = container.querySelector(".overflow-hidden") as HTMLDivElement;
    expect(extraContainer?.style.height).toBe("0px");
    expect(extraContainer?.style.opacity).toBe("0");

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
});

describe("SocialLinks", () => {
  const mockProfile: Profile = {
    description: "test",
    email: "test@example.com",
    links: {
      github: { label: "GitHub", url: "https://github.com/testuser" },
      linkedin: { label: "LinkedIn", url: "https://linkedin.com/in/test" },
      twitter: { label: "X", url: "https://x.com/test" },
    },
    name: "Test User",
    tagline: "test",
  };

  it("renders social links", () => {
    render(<SocialLinks profile={mockProfile} />);
    expect(screen.getByLabelText("GitHub")).toBeDefined();
    expect(screen.getByLabelText("LinkedIn")).toBeDefined();
    expect(screen.getByLabelText("Twitter/X")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
  });

  it("uses profile links when available", () => {
    render(<SocialLinks profile={mockProfile} />);
    const githubLink = screen.getByLabelText("GitHub");
    expect(githubLink?.getAttribute("href")).toBe("https://github.com/testuser");
    const emailLink = screen.getByLabelText("Email");
    expect(emailLink?.getAttribute("href")).toBe("mailto:test@example.com");
  });

  it("renders nothing when profile is undefined", () => {
    const { container } = render(<SocialLinks profile={undefined} />);
    // Should be an empty flex container with no children
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(0);
  });
});
