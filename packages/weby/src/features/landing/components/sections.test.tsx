import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExperienceItem, Profile } from "#/shared/types";
import { ExperienceSection, ProfileSection, SocialLinks } from "./sections";

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
