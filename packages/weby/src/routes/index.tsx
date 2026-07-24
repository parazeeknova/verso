import { createFileRoute } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GitHubActivity } from "#/features/github/components/calendar";
import { GitHubStats } from "#/features/github/components/stats";
import {
  ExperienceSection,
  ProfileSection,
  SocialLinks,
} from "#/features/landing/components/sections";
import { ReadmeViewer } from "#/features/landing/components/readme-viewer";
import { ProjectList } from "#/features/landing/components/projects";
import { BlogReaderPanel } from "#/features/blog/components/blog-reader-panel";
import { LoginPopup } from "#/features/auth/components/login-popup";
import { useIsDesktop } from "#/shared/lib/desktop";
import { DesktopFrontPage } from "#/features/auth/components/desktop-front-page";
import {
  useBlogManifest,
  useExperience,
  useIsFetchingData,
  useProfile,
  useProjects,
} from "#/features/landing/hooks/use-data";
import { crossfadeVideo, getHeaderGradient } from "#/shared/lib/video-helpers";

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
  const isDesktop = useIsDesktop();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<"portfolio" | "blogs">("portfolio");
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<{
    productUrl?: string;
    readmeUrl: string;
    repoUrl?: string;
    title: string;
  } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      const windowAtBottom =
        Math.ceil(window.innerHeight + window.scrollY) >=
        document.documentElement.scrollHeight - 10;
      const containerAtBottom = el
        ? Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 10
        : false;

      setIsAtBottom(windowAtBottom || containerAtBottom);
    };

    const el = containerRef.current;
    window.addEventListener("scroll", handleScroll, { passive: true });
    el?.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      el?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const themeRefs = useThemeButtonHover();
  const themeRefsRight = useThemeButtonHover();

  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: projects } = useProjects();
  const { data: manifest = [] } = useBlogManifest();
  const isPending = useIsFetchingData();

  if (isDesktop) {
    return <DesktopFrontPage />;
  }

  const firstPostSlug = useMemo(() => {
    for (const section of manifest) {
      if (section.children && section.children.length > 0) {
        return section.children[0].slug;
      }
    }
    return null;
  }, [manifest]);

  const firstProject = useMemo(() => projects?.find((p) => p.readmeUrl) ?? null, [projects]);

  // Auto-select first blog or first project with readme
  useEffect(() => {
    if (selectedBlogSlug || selectedProject) {
      return;
    }
    if (firstPostSlug) {
      setSelectedBlogSlug(firstPostSlug);
    } else if (firstProject?.readmeUrl) {
      setSelectedProject({
        productUrl: firstProject.productUrl,
        readmeUrl: firstProject.readmeUrl,
        repoUrl: firstProject.repoUrl,
        title: firstProject.title,
      });
    }
  }, [firstPostSlug, firstProject, selectedBlogSlug, selectedProject]);

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const videoActiveNext = useRef(false);

  useEffect(() => {
    const src = isDarkMode
      ? "https://img.przknv.cc/t/header.mp4"
      : "https://img.przknv.cc/t/footer.mp4";
    if (videoActiveNext.current) {
      if (nextVideoRef.current) {
        nextVideoRef.current.src = src;
        nextVideoRef.current.style.opacity = "1";
      }
      if (videoRef.current) {
        videoRef.current.style.opacity = "0";
      }
    } else {
      if (videoRef.current) {
        videoRef.current.src = src;
        videoRef.current.style.opacity = "1";
      }
      if (nextVideoRef.current) {
        nextVideoRef.current.style.opacity = "0";
      }
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.dataset.theme = newTheme;
  }, [isDarkMode]);

  const animatedToggleTheme = useCallback(() => {
    const nextDark = !isDarkMode;
    const nextSrc = nextDark
      ? "https://img.przknv.cc/t/header.mp4"
      : "https://img.przknv.cc/t/footer.mp4";
    const fromRef = videoActiveNext.current ? nextVideoRef : videoRef;
    const toRef = videoActiveNext.current ? videoRef : nextVideoRef;

    crossfadeVideo(fromRef, toRef, nextSrc, () => {
      videoActiveNext.current = !videoActiveNext.current;
      toggleTheme();
    });
  }, [isDarkMode, toggleTheme]);

  const handleProjectDetail = useCallback(
    (project: { productUrl?: string; readmeUrl?: string; repoUrl?: string; title: string }) => {
      if (!project.readmeUrl) {
        return;
      }
      setSelectedBlogSlug(null);
      setSelectedProject({
        productUrl: project.productUrl,
        readmeUrl: project.readmeUrl,
        repoUrl: project.repoUrl,
        title: project.title,
      });
      setViewMode("blogs");
    },
    [],
  );

  const handleSelectPost = useCallback((slug: string) => {
    setSelectedProject(null);
    setSelectedBlogSlug(slug);
    setViewMode("blogs");
  }, []);

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

  if (viewMode === "blogs") {
    const activeSlug = selectedBlogSlug ?? firstPostSlug ?? "";
    return (
      <div
        data-theme={isDarkMode ? "dark" : "light"}
        className={`h-screen w-full select-none overflow-hidden ${
          isDarkMode ? "bg-bg-dark text-text-dark" : "bg-bg-light text-text-light"
        }`}
      >
        {selectedProject ? (
          <ReadmeViewer
            isDarkMode={isDarkMode}
            isMobile={isMobile}
            manifest={manifest}
            onBack={() => {
              setSelectedProject(null);
              if (firstPostSlug) {
                setSelectedBlogSlug(firstPostSlug);
              }
            }}
            onSelectPost={handleSelectPost}
            onSelectProject={handleProjectDetail}
            onSwitchToAbout={() => setViewMode("portfolio")}
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
            onSelectPost={handleSelectPost}
            onSelectProject={handleProjectDetail}
            onSwitchToAbout={() => setViewMode("portfolio")}
            onToggleTheme={toggleTheme}
            projects={projects}
            slug={activeSlug}
            themeButtonRef={themeRefsRight.buttonRef as React.RefObject<HTMLButtonElement | null>}
            themeIndicatorRef={
              themeRefsRight.indicatorRef as React.RefObject<HTMLSpanElement | null>
            }
          />
        )}
      </div>
    );
  }

  const headerGradient = getHeaderGradient(isDarkMode);

  return (
    <div
      ref={containerRef}
      data-theme={isDarkMode ? "dark" : "light"}
      className={`min-h-screen w-full select-none overflow-y-auto ${
        isDarkMode ? "bg-bg-dark text-text-dark" : "bg-bg-light text-text-light"
      }`}
    >
      {/* Header Video */}
      <div className="relative mx-auto w-full max-w-3xl h-48 sm:h-64 overflow-hidden">
        <video
          ref={nextVideoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }}
          src="https://img.przknv.cc/t/footer.mp4"
        />
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="https://img.przknv.cc/t/header.mp4"
        />
        <div
          ref={gradientRef}
          className="absolute inset-0 pointer-events-none"
          style={{ background: headerGradient }}
        />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            className={`text-[13px] lowercase focus:outline-none hover:opacity-70 ${
              isDarkMode
                ? "text-text-dark/60 hover:text-text-dark"
                : "text-text-light/60 hover:text-text-light"
            }`}
            onClick={() => setViewMode("blogs")}
            type="button"
          >
            blogs
          </button>
          <button
            aria-label="Toggle theme"
            className="rounded-full p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40"
            onClick={animatedToggleTheme}
            ref={themeRefs.buttonRef}
            type="button"
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

        <div className="shrink-0 space-y-2">
          <h3 className="font-medium text-base">voo look what i made</h3>
          <ProjectList onDetail={handleProjectDetail} />
        </div>

        <GitHubActivity isDarkMode={isDarkMode} username={githubUsername}>
          <GitHubStats />
        </GitHubActivity>

        <div className="shrink-0 flex items-center justify-between pt-2">
          <SocialLinks profile={profile} />
          <LoginPopup isAtBottom={isAtBottom} isDarkMode={isDarkMode} />
        </div>

        <div className="flex justify-end pt-4 pb-2">
          <span
            className="text-4xl sm:text-5xl opacity-40"
            style={{ fontFamily: '"Louison Adriana", cursive' }}
          >
            — with love, harsh
          </span>
        </div>
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
