import { createFileRoute } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GitHubActivity } from "#/features/github/components/calendar";
import { GitHubStats } from "#/features/github/components/stats";
import {
  ExperienceSection,
  ProfileSection,
  SocialLinks,
} from "#/features/landing/components/sections";
import { ScrollContainer } from "#/features/landing/components/scroll-container";
import { ReadmeViewer } from "#/features/landing/components/readme-viewer";
import { MobileProjectList, ProjectList } from "#/features/landing/components/projects";
import { BlogReaderPanel } from "#/features/blog/components/blog-reader-panel";
import { LoginPopup } from "#/features/auth/components/login-popup";
import {
  useBlogManifest,
  useExperience,
  useIsFetchingData,
  useProfile,
  useProjects,
} from "#/features/landing/hooks/use-data";

const useIsMobile = (): boolean => {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth < 1024;
  }, []);

  const getServerSnapshot = useCallback(() => false, []);

  // eslint-disable-next-line promise/prefer-await-to-callbacks -- useSyncExternalStore requires callback pattern
  const subscribe = useCallback((callback: () => void) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- event handler callback required
    const handleResize = () => callback();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

interface ThemeButtonRefs {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  indicatorRef: React.RefObject<HTMLSpanElement | null>;
}

const useThemeButtonHover = (): ThemeButtonRefs => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const themeButton = buttonRef.current;
    const themeIndicator = indicatorRef.current;
    if (!(themeButton && themeIndicator)) {
      return;
    }

    const enter = () => {
      const { color } = getComputedStyle(themeButton);
      gsap.to(themeIndicator, {
        backgroundColor: color,
        borderWidth: 0,
        duration: 0.18,
        ease: "power2.out",
      });
    };

    const leave = () => {
      gsap.to(themeIndicator, {
        backgroundColor: "rgba(0,0,0,0)",
        borderWidth: 1,
        duration: 0.18,
        ease: "power2.in",
      });
    };

    themeButton.addEventListener("mouseenter", enter);
    themeButton.addEventListener("mouseleave", leave);
    themeButton.addEventListener("focus", enter);
    themeButton.addEventListener("blur", leave);

    return () => {
      themeButton.removeEventListener("mouseenter", enter);
      themeButton.removeEventListener("mouseleave", leave);
      themeButton.removeEventListener("focus", enter);
      themeButton.removeEventListener("blur", leave);
    };
  }, []);

  return { buttonRef, indicatorRef };
};

const Home = function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mobileView, setMobileView] = useState<"about" | "blogs">("about");
  const [selectedProject, setSelectedProject] = useState<{
    productUrl?: string;
    readmeUrl: string;
    repoUrl?: string;
    title: string;
  } | null>(null);
  const isMobile = useIsMobile();

  const themeRefs = useThemeButtonHover();
  const themeRefsRight = useThemeButtonHover();

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: projects } = useProjects();
  const { data: manifest = [] } = useBlogManifest();
  const isPending = useIsFetchingData();

  // Auto-select first project readme when no blog posts exist
  useEffect(() => {
    if (!projects || projects.length === 0) {
      return;
    }
    if (selectedProject) {
      return;
    }
    const hasPosts = manifest.some((s) => s.children.length > 0);
    if (hasPosts) {
      return;
    }
    const firstWithReadme = projects.find((p) => p.readmeUrl);
    if (firstWithReadme?.readmeUrl) {
      setSelectedProject({
        productUrl: firstWithReadme.productUrl,
        readmeUrl: firstWithReadme.readmeUrl,
        repoUrl: firstWithReadme.repoUrl,
        title: firstWithReadme.title,
      });
      if (!isMobile) {
        setMobileView("blogs");
      }
    }
  }, [projects, manifest, selectedProject, isMobile]);

  // Read initial theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light") {
        setIsDarkMode(false);
      } else {
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.dataset.theme = newTheme;
  }, [isDarkMode]);

  const handleProjectDetail = useCallback(
    (project: { productUrl?: string; readmeUrl?: string; repoUrl?: string; title: string }) => {
      if (!project.readmeUrl) {
        return;
      }
      setSelectedProject({
        productUrl: project.productUrl,
        readmeUrl: project.readmeUrl,
        repoUrl: project.repoUrl,
        title: project.title,
      });
      if (isMobile) {
        setMobileView("blogs");
      }
    },
    [isMobile],
  );

  // Extract GitHub username from profile or env
  const githubUsername = (() => {
    const url = profile?.links?.github?.url;
    if (url) {
      const match = url.match(/github\.com\/([^/]+)/);
      if (match) {
        return match[1];
      }
    }
    return "parazeeknova";
  })();

  let rightPanelVisibility: string;
  if (isMobile) {
    rightPanelVisibility = mobileView === "blogs" ? "h-screen overflow-hidden" : "hidden";
  } else {
    rightPanelVisibility = "min-h-0 overflow-hidden lg:border-l";
  }

  return (
    <div
      className="relative grid min-h-screen grid-cols-1 lg:overflow-hidden lg:h-screen lg:grid-cols-2"
      ref={mainContainerRef}
    >
      <div
        data-theme={isDarkMode ? "dark" : "light"}
        className={`relative z-10 flex select-none flex-col gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 lg:gap-8 lg:overflow-hidden lg:p-8 ${
          isDarkMode ? "bg-bg-dark text-text-dark" : "bg-bg-light text-text-light"
        } ${isMobile && mobileView !== "about" ? "hidden" : ""}`}
        ref={leftPanelRef}
      >
        <div className="absolute top-4 right-4 flex items-center gap-3 sm:top-6 sm:right-6 lg:top-8 lg:right-8">
          {isMobile && (
            <button
              className={`text-[13px] lowercase focus:outline-none hover:opacity-70 ${
                isDarkMode ? "text-text-dark/60" : "text-text-light/60"
              }`}
              onClick={() => setMobileView("blogs")}
            >
              blogs
            </button>
          )}
          <button
            aria-label="Toggle theme"
            className="rounded-full p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40"
            onClick={toggleTheme}
            ref={themeRefs.buttonRef}
          >
            <span className="sr-only">Toggle theme</span>
            <span
              className="block h-3 w-3 rounded-full border border-current"
              ref={themeRefs.indicatorRef}
              style={{ backgroundColor: "transparent" }}
            />
          </button>
        </div>

        <ProfileSection isMobile={isMobile} isPending={isPending} profile={profile} />

        <div className="shrink-0 space-y-2">
          <h3 className="font-medium text-base">work i did</h3>
          <ExperienceSection experience={experience} isPending={isPending} />
        </div>

        {isMobile ? (
          <div className="shrink-0 space-y-2">
            <h3 className="font-medium text-base">voo look what i made</h3>
            <MobileProjectList onDetail={handleProjectDetail} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-2 shrink-0 font-medium text-base">voo look what i made</h3>
            <ScrollContainer className="min-h-0 flex-1">
              <ProjectList onDetail={handleProjectDetail} />
            </ScrollContainer>
          </div>
        )}

        <GitHubActivity isDarkMode={isDarkMode} username={githubUsername}>
          <GitHubStats />
        </GitHubActivity>

        <div className="shrink-0 flex items-center justify-between">
          <SocialLinks profile={profile} />
          <LoginPopup isDarkMode={isDarkMode} />
        </div>
      </div>

      <div
        data-theme={isDarkMode ? "dark" : "light"}
        className={`relative ${rightPanelVisibility} ${
          isDarkMode
            ? "border-border-dark bg-bg-dark text-text-dark"
            : "border-border-light bg-bg-light text-text-light"
        }`}
        ref={rightPanelRef}
      >
        {selectedProject ? (
          <ReadmeViewer
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            manifest={manifest}
            onBack={() => setSelectedProject(null)}
            onSelectPost={() => setSelectedProject(null)}
            onSelectProject={handleProjectDetail}
            onSwitchToAbout={() => setMobileView("about")}
            onToggleTheme={toggleTheme}
            productUrl={selectedProject.productUrl}
            projectTitle={selectedProject.title}
            projects={projects}
            readmeUrl={selectedProject.readmeUrl}
            repoUrl={selectedProject.repoUrl}
            themeButtonRef={themeRefsRight.buttonRef as React.RefObject<HTMLButtonElement | null>}
            themeIndicatorRef={
              themeRefsRight.indicatorRef as React.RefObject<HTMLSpanElement | null>
            }
          />
        ) : (
          <BlogReaderPanel
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            manifest={manifest}
            onSelectProject={handleProjectDetail}
            onSwitchToAbout={() => setMobileView("about")}
            onToggleTheme={toggleTheme}
            projects={projects}
            slug=""
            themeButtonRef={themeRefsRight.buttonRef as React.RefObject<HTMLButtonElement | null>}
            themeIndicatorRef={
              themeRefsRight.indicatorRef as React.RefObject<HTMLSpanElement | null>
            }
          />
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  head: () => {
    const origin =
      typeof window === "undefined"
        ? import.meta.env.VITE_APP_ORIGIN || "https://przknv.cc"
        : window.location.origin;
    const ogImage = `${origin}/verso-og.png`;
    return {
      links: [{ href: origin, rel: "canonical" }],
      meta: [
        { title: "verso — personal knowledge base and folio" },
        {
          content:
            "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
          name: "description",
        },
        {
          content:
            "verso, wiki, knowledge base, self-hosted, open-source, markdown, real-time collaboration",
          name: "keywords",
        },
        { content: "verso — personal knowledge base and folio", property: "og:title" },
        {
          content:
            "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
          property: "og:description",
        },
        { content: "website", property: "og:type" },
        { content: ogImage, property: "og:image" },
        { content: "1200", property: "og:image:width" },
        { content: "630", property: "og:image:height" },
        { content: "image/png", property: "og:image:type" },
        { content: "summary_large_image", property: "twitter:card" },
        { content: "verso — personal knowledge base and folio", property: "twitter:title" },
        {
          content:
            "verso is a personal knowledge base and folio, blog for public face & private brain, one app.",
          property: "twitter:description",
        },
        { content: ogImage, property: "twitter:image" },
      ],
    };
  },
});
