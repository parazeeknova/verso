import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { extractBlogHeadings } from "#/features/blog/lib/blog-headings";
import { markdownToHtml } from "#/features/blog/lib/markdown-to-html";
import { AnimatedLink } from "#/shared/components/animated-link";
import { BlogFileTree } from "#/features/blog/components/blog-file-tree";
import type { BlogManifestSection } from "#/shared/types";
import { BlogTableOfContents } from "#/features/blog/components/blog-table-of-contents";

interface ReadmeViewerProps {
  isDarkMode: boolean;
  isMobile: boolean;
  manifest: BlogManifestSection[];
  onBack: () => void;
  onSelectPost?: (slug: string) => void;
  onSelectProject?: (project: { readmeUrl?: string; title: string }) => void;
  onSwitchToAbout?: () => void;
  onToggleTheme?: () => void;
  productUrl?: string;
  projectTitle: string;
  projects?: { readmeUrl?: string; title: string }[];
  readmeUrl: string;
  repoUrl?: string;
  themeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  themeIndicatorRef?: React.RefObject<HTMLSpanElement | null>;
}

// eslint-disable-next-line complexity -- component with multiple render modes, refactor later
export const ReadmeViewer = ({
  isDarkMode,
  isMobile,
  manifest,
  onBack,
  onSelectPost,
  onSelectProject,
  onSwitchToAbout,
  onToggleTheme,
  productUrl,
  projectTitle,
  projects,
  readmeUrl,
  repoUrl,
  themeButtonRef,
  themeIndicatorRef,
}: ReadmeViewerProps) => {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [asideMounted, setAsideMounted] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const {
    data: markdown,
    isPending,
    isError,
  } = useQuery({
    queryFn: async ({ signal }) => {
      const res = await fetch(readmeUrl, { signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.text();
    },
    queryKey: ["readme", readmeUrl],
    staleTime: 5 * 60 * 1000,
  });

  // Pre-process HTML to embed heading IDs so they exist when React sets innerHTML
  const { html, headings } = useMemo(() => {
    if (!markdown) {
      return { headings: [], html: "" };
    }
    const raw = markdownToHtml(markdown);
    const div = document.createElement("div");
    div.innerHTML = raw;

    // Collapse center-aligned kbd button sections into a <details> block
    const centerDivs = div.querySelectorAll<HTMLDivElement>('div[align="center"]');
    for (const center of centerDivs) {
      if (center.querySelector("kbd")) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "kbd elements";
        summary.style.cssText =
          "cursor:pointer;font-size:0.85em;opacity:0.6;margin-bottom:0.75rem;user-select:none;";
        // oxlint-disable-next-line unicorn/prefer-dom-node-append
        details.appendChild(summary);
        // oxlint-disable-next-line unicorn/prefer-dom-node-append
        details.appendChild(center.cloneNode(true));
        center.replaceWith(details);
      }
    }

    const extracted = extractBlogHeadings(div);
    return { headings: extracted, html: div.innerHTML };
  }, [markdown]);

  useEffect(() => {
    if (isPending || !html || !contentRef.current) {
      return;
    }
    const el = contentRef.current;
    const blocks = [...el.children];
    if (blocks.length === 0) {
      return;
    }

    gsap.killTweensOf(blocks);
    gsap.fromTo(
      blocks,
      {
        filter: "blur(10px)",
        opacity: 0,
        y: 14,
      },
      {
        duration: 0.55,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1,
        stagger: 0.035,
        y: 0,
      },
    );
  }, [isPending, html]);

  const handleSelectHeading = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(id);
    }
  }, []);

  const toggleAside = useCallback(() => {
    if (asideMounted) {
      const el = asideRef.current;
      if (el) {
        gsap.to(el, {
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => setAsideMounted(false),
          opacity: 0,
          x: 24,
        });
      }
    } else {
      setAsideMounted(true);
    }
  }, [asideMounted]);

  useEffect(() => {
    if (asideMounted && asideRef.current) {
      gsap.fromTo(
        asideRef.current,
        { opacity: 0, x: 24 },
        { duration: 0.25, ease: "power2.out", opacity: 1, x: 0 },
      );
    }
  }, [asideMounted]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || headings.length === 0) {
      return;
    }

    const headingElements = headings
      .map((h) => container.querySelector(`#${h.id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { root: container, rootMargin: "-10% 0px -80% 0px", threshold: 0.1 },
    );

    for (const el of headingElements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  let content: React.ReactNode;
  if (isPending) {
    content = (
      <p className={`text-sm ${isDarkMode ? "text-text-dark/60" : "text-text-light/60"}`}>
        loading readme...
      </p>
    );
  } else if (isError) {
    content = (
      <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
        failed to load readme.
      </p>
    );
  } else {
    content = (
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${
          !isMobile && asideMounted ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""
        }`}
      >
        <div className="min-h-0 overflow-y-auto pr-2" ref={scrollRef}>
          <div
            className="blog-reader-prose mx-auto max-w-3xl"
            dangerouslySetInnerHTML={{ __html: html }}
            ref={contentRef}
          />
        </div>
        {isMobile
          ? tocOpen && (
              <div className="fixed inset-0 z-50" role="dialog">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setTocOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setTocOpen(false);
                    }
                  }}
                  role="presentation"
                />
                <div
                  className={`absolute top-12 right-4 max-h-[80vh] w-64 overflow-y-auto border p-4 shadow-xl sm:top-16 sm:right-6 ${
                    isDarkMode ? "border-border-dark bg-bg-dark" : "border-border-light bg-bg-light"
                  }`}
                >
                  <BlogTableOfContents
                    activeHeadingId={activeHeadingId}
                    headings={headings}
                    isDarkMode={isDarkMode}
                    onSelect={(id) => {
                      handleSelectHeading(id);
                      setTocOpen(false);
                    }}
                  />
                  <div className="mt-4 pt-4">
                    <BlogFileTree
                      activeProjectTitle={projectTitle}
                      isDarkMode={isDarkMode}
                      manifest={manifest}
                      onSelectPost={onSelectPost}
                      onSelectProject={onSelectProject}
                      projects={projects}
                    />
                  </div>
                </div>
              </div>
            )
          : asideMounted && (
              <aside
                className="space-y-8 sticky top-0 self-start max-h-[calc(100vh-100px)] overflow-y-auto pr-1"
                ref={asideRef}
              >
                <BlogTableOfContents
                  activeHeadingId={activeHeadingId}
                  headings={headings}
                  isDarkMode={isDarkMode}
                  onSelect={handleSelectHeading}
                />
                <BlogFileTree
                  activeProjectTitle={projectTitle}
                  isDarkMode={isDarkMode}
                  manifest={manifest}
                  onSelectPost={onSelectPost}
                  onSelectProject={onSelectProject}
                  projects={projects}
                />
              </aside>
            )}
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col p-4 sm:p-6 lg:p-8 ${
        isDarkMode ? "text-text-dark" : "text-text-light"
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        <button
          className={`text-[13px] shrink-0 whitespace-nowrap ${
            isDarkMode ? "text-[#b58cff]" : "text-purple-600"
          }`}
          onClick={onBack}
          type="button"
        >
          back
        </button>
        <p
          className={`text-[13px] leading-snug break-words flex-1 ${
            isDarkMode ? "text-text-dark/60" : "text-text-light/60"
          }`}
        >
          {projectTitle}
        </p>
        {repoUrl && (
          <AnimatedLink
            className="text-[13px] lowercase shrink-0 whitespace-nowrap"
            href={repoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            repo
          </AnimatedLink>
        )}
        {productUrl && (
          <AnimatedLink
            className="text-[13px] lowercase shrink-0 whitespace-nowrap"
            href={productUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            product
          </AnimatedLink>
        )}
        {isMobile ? (
          <button
            className={`text-[13px] lowercase shrink-0 whitespace-nowrap focus:outline-none hover:opacity-70 ${
              isDarkMode ? "text-text-dark/60" : "text-text-light/60"
            }`}
            onClick={() => setTocOpen(!tocOpen)}
            type="button"
          >
            {tocOpen ? "close" : "toc"}
          </button>
        ) : (
          <button
            className={`text-[13px] lowercase shrink-0 whitespace-nowrap focus:outline-none ${
              isDarkMode
                ? "text-text-dark/60 hover:text-text-dark"
                : "text-text-light/60 hover:text-text-light"
            }`}
            onClick={toggleAside}
            type="button"
          >
            {asideMounted ? "hide toc" : "show toc"}
          </button>
        )}
        {onSwitchToAbout && (
          <button
            className={`text-[13px] lowercase shrink-0 whitespace-nowrap focus:outline-none hover:opacity-70 ${
              isDarkMode ? "text-text-dark/60" : "text-text-light/60"
            }`}
            onClick={onSwitchToAbout}
            type="button"
          >
            portfolio
          </button>
        )}
        {onToggleTheme && (
          <button
            aria-label="Toggle theme"
            className="shrink-0 rounded-full p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40"
            onClick={onToggleTheme}
            ref={themeButtonRef}
            type="button"
          >
            <span className="sr-only">Toggle theme</span>
            <span
              className="block h-3 w-3 rounded-full border border-current"
              ref={themeIndicatorRef}
              style={{ backgroundColor: "transparent" }}
            />
          </button>
        )}
      </div>

      {content}
    </div>
  );
};
