import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { BlogFileTree } from "./blog-file-tree";
import { BlogTableOfContents } from "./blog-table-of-contents";
import { ReadonlyBlogEditor } from "./readonly-blog-editor";
import type { TiptapHeading } from "./readonly-blog-editor";
import type { BlogManifestSection, BlogPost } from "#/shared/types";

interface BlogReaderProps {
  post: BlogPost;
  isDarkMode: boolean;
  isMobile: boolean;
  manifest: BlogManifestSection[];
  onToggleTheme?: () => void;
  onSwitchToAbout?: () => void;
  onSelectPost?: (slug: string) => void;
  onSelectProject?: (project: { readmeUrl?: string; title: string }) => void;
  projects?: { readmeUrl?: string; title: string }[];
  themeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  themeIndicatorRef?: React.RefObject<HTMLSpanElement | null>;
}

// eslint-disable-next-line complexity -- component with multiple render modes, refactor later
export const BlogReader = ({
  post,
  isDarkMode,
  isMobile,
  manifest,
  onToggleTheme,
  onSwitchToAbout,
  onSelectPost,
  onSelectProject,
  projects,
  themeButtonRef,
  themeIndicatorRef,
}: BlogReaderProps) => {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [tiptapHeadings, setTiptapHeadings] = useState<TiptapHeading[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [asideMounted, setAsideMounted] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const headingsRef = useRef<TiptapHeading[]>([]);

  useEffect(() => {
    if (!post || !headerRef.current) {
      return;
    }
    const el = headerRef.current;
    const children = [...el.children];
    if (children.length === 0) {
      return;
    }

    gsap.killTweensOf(children);
    gsap.fromTo(
      children,
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
        stagger: 0.05,
        y: 0,
      },
    );
  }, [post]);

  const handleHeadingsExtracted = useCallback((headings: TiptapHeading[]) => {
    // Only update if headings actually changed to avoid infinite loops
    const prev = headingsRef.current;
    if (prev.length === headings.length && prev.every((h, i) => h.id === headings[i].id)) {
      return;
    }
    headingsRef.current = headings;
    setTiptapHeadings(headings);
  }, []);

  // Set up IntersectionObserver for active heading tracking
  useEffect(() => {
    const headings = tiptapHeadings;
    if (headings.length === 0) {
      return;
    }

    // Disconnect previous observer
    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visibleHeadings = entries.filter((e) => e.isIntersecting);
        if (visibleHeadings.length > 0) {
          // Sort by their position in the DOM (topmost first)
          visibleHeadings.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const topMostId = visibleHeadings[0]?.target.id;
          if (topMostId) {
            setActiveHeadingId(topMostId);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0.1,
      },
    );

    // Observe all heading elements
    for (const heading of headings) {
      const el = document.querySelector(`#${heading.id}`);
      if (el) {
        observer.observe(el);
      }
    }

    observerRef.current = observer;

    return () => observer.disconnect();
  }, [tiptapHeadings]);

  const handleSelectHeading = (id: string) => {
    const el = document.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(id);
    }
  };

  const toggleAside = () => {
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
  };

  useEffect(() => {
    if (asideMounted && asideRef.current) {
      gsap.fromTo(
        asideRef.current,
        { opacity: 0, x: 24 },
        { duration: 0.25, ease: "power2.out", opacity: 1, x: 0 },
      );
    }
  }, [asideMounted]);

  const headerRight = (
    <div className="flex items-center gap-3">
      {isMobile ? (
        <button
          className={`text-[13px] lowercase focus:outline-none ${
            isDarkMode
              ? "text-text-dark/60 hover:text-text-dark"
              : "text-text-light/60 hover:text-text-light"
          }`}
          onClick={() => setTocOpen(!tocOpen)}
          type="button"
        >
          {tocOpen ? "close" : "toc"}
        </button>
      ) : (
        <button
          className={`text-[13px] lowercase focus:outline-none ${
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
          className={`text-[13px] lowercase focus:outline-none hover:opacity-70 ${
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
          className="rounded-full p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40"
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
  );

  return (
    <div
      data-theme={isDarkMode ? "dark" : "light"}
      className={`flex h-full min-h-0 flex-col p-4 sm:p-6 lg:p-8 ${
        isDarkMode ? "text-text-dark" : "text-text-light"
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        <button
          className={`text-[13px] ${isDarkMode ? "text-[#b58cff]" : "text-purple-600"}`}
          type="button"
        >
          all blogs
        </button>
        <div className="flex-1" />
        {headerRight}
      </div>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${
          !isMobile && asideMounted ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""
        }`}
      >
        <div className="min-h-0 overflow-y-auto pr-2" ref={scrollContainerRef}>
          <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6 lg:space-y-8">
            <header className="space-y-4" ref={headerRef} style={{ perspective: 1000 }}>
              <h2 className="text-4xl">{post.title}</h2>
              <p className={`text-sm ${isDarkMode ? "text-text-dark/55" : "text-text-light/55"}`}>
                {post.publishedAt ?? ""}{" "}
                {typeof post.readTimeMinutes === "number"
                  ? `\u2022 ${post.readTimeMinutes} min read`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {(post.tags ?? []).map((tag) => (
                  <span
                    className={`border px-3 py-1 text-[12px] ${
                      isDarkMode
                        ? "border-[#6e4e99] text-[#d1b3ff]"
                        : "border-purple-200 text-purple-700"
                    }`}
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className={`max-w-2xl ${isDarkMode ? "text-text-dark/80" : "text-text-light/80"}`}>
                {post.description ?? ""}
              </p>
            </header>

            <ReadonlyBlogEditor
              content={post.content ?? null}
              onHeadingsExtracted={handleHeadingsExtracted}
            />

            <div
              className={`sticky bottom-0 mt-8 flex items-center justify-between border-t pt-6 text-[13px] theme-bg ${
                isDarkMode
                  ? "border-border-dark text-[#b58cff]"
                  : "border-border-light text-purple-600"
              }`}
            >
              <button type="button">prev post</button>
              <button type="button">next post</button>
            </div>
          </div>
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
                    headings={tiptapHeadings}
                    isDarkMode={isDarkMode}
                    onSelect={(id) => {
                      handleSelectHeading(id);
                      setTocOpen(false);
                    }}
                  />
                  <div className="mt-4 pt-4">
                    <BlogFileTree
                      activeSlug={post.slug}
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
                  headings={tiptapHeadings}
                  isDarkMode={isDarkMode}
                  onSelect={handleSelectHeading}
                />
                <BlogFileTree
                  activeSlug={post.slug}
                  isDarkMode={isDarkMode}
                  manifest={manifest}
                  onSelectPost={onSelectPost}
                  onSelectProject={onSelectProject}
                  projects={projects}
                />
              </aside>
            )}
      </div>
    </div>
  );
};
