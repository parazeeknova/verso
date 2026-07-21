import { BlogReader } from "./blog-reader";
import { BlogFileTree } from "./blog-file-tree";
import { useBlogPost } from "../hooks/use-blog-post";
import type { BlogManifestSection } from "#/shared/types";

interface BlogReaderPanelProps {
  slug: string;
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

export const BlogReaderPanel = ({
  slug,
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
}: BlogReaderPanelProps) => {
  // When no slug is available (e.g. initial mount before a blog is selected),
  // show the empty state immediately without making a doomed API call.
  if (!slug) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className={`text-[13px] ${isDarkMode ? "text-text-dark/30" : "text-text-light/30"}`}>
            browse articles & projects
          </p>
          <div className="flex items-center gap-3">
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
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BlogFileTree
            isDarkMode={isDarkMode}
            manifest={manifest}
            onSelectPost={onSelectPost}
            onSelectProject={onSelectProject}
            projects={projects}
          />
        </div>
      </div>
    );
  }

  const { data, isError, isPending } = useBlogPost(slug);

  if (isPending) {
    return (
      <div
        className={`px-8 py-10 text-sm ${isDarkMode ? "text-text-dark/60" : "text-text-light/60"}`}
      >
        loading article...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`px-8 py-10 text-sm ${isDarkMode ? "text-text-dark/60" : "text-text-light/60"}`}
      >
        failed to load articles — please try again
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <p className={`text-[13px] ${isDarkMode ? "text-text-dark/30" : "text-text-light/30"}`}>
            no articles yet — browse projects below
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BlogFileTree
            isDarkMode={isDarkMode}
            manifest={manifest}
            onSelectPost={onSelectPost}
            onSelectProject={onSelectProject}
            projects={projects}
          />
        </div>
      </div>
    );
  }

  return (
    <BlogReader
      isDarkMode={isDarkMode}
      isMobile={isMobile}
      manifest={manifest}
      onSelectPost={onSelectPost}
      onSelectProject={onSelectProject}
      onSwitchToAbout={onSwitchToAbout}
      onToggleTheme={onToggleTheme}
      post={data}
      projects={projects}
      themeButtonRef={themeButtonRef}
      themeIndicatorRef={themeIndicatorRef}
    />
  );
};
