import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { BookmarkSimpleIcon, ListBulletsIcon, XIcon } from "@phosphor-icons/react";
import { useTheme } from "#/shared/hooks/use-theme";
import { getEditorExtensions } from "#/features/editor/extensions";
import { useEditorContent } from "#/features/editor/hooks/use-editor-content";
import { BubbleMenu } from "#/features/editor/components/toolbar/bubble-menu";
import { EditorMoreMenu } from "#/features/editor/components/editor-more-menu";
import {
  useIsPageFavorited,
  useTogglePageFavorite,
} from "#/features/console/hooks/use-page-favorites";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { useIsPageWatching, useWatchPage } from "#/features/console/hooks/use-page-watches";
import { BlogTableOfContents } from "#/features/blog/components/blog-table-of-contents";
import type { BlogHeading } from "#/features/blog/lib/blog-headings";
import { extractEditorHeadings } from "#/features/editor/lib/editor-headings";
import type { PageEditorProps } from "#/features/editor/types/editor.types";

const parseContent = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "doc" &&
      Array.isArray(parsed.content)
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { content: [], type: "doc" };
};

const safeCssEscape = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, "\\$&");
};

export const PageEditor = ({
  pageId,
  contentJson,
  editable,
  title,
  spaceName,
  spaceSlug,
  creatorId,
  createdAt,
  updatedAt,
  textContent,
  onDeleteStart,
}: PageEditorProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const content = useMemo(() => parseContent(contentJson), [contentJson]);
  const [tocOpen, setTocOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<BlogHeading[]>(() => extractEditorHeadings(content));

  const markDirtyRef = useRef<(() => void) | null>(null);

  const editor = useEditor({
    content,
    editable,
    editorProps: {
      attributes: {
        class: "outline-none border-none focus:outline-none focus:border-none focus:ring-0",
      },
    },
    extensions: getEditorExtensions(),
    immediatelyRender: false,
    onUpdate: () => {
      const liveContent = editor?.getJSON();
      if (liveContent) {
        setHeadings(extractEditorHeadings(liveContent));
      }
      if (editable) {
        markDirtyRef.current?.();
      }
    },
  });

  const { dirty, cleanup, isSaving, lastSaved, markDirty } = useEditorContent(editor, pageId);
  const { data: favData } = useIsPageFavorited(pageId);
  const toggleFav = useTogglePageFavorite();
  const isFaved = favData?.favorited ?? false;
  const { data: watchData } = useIsPageWatching(pageId);
  const watchPage = useWatchPage();
  const isWatching = watchData?.watching ?? false;

  const [fullWidth, setFullWidth] = useState(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      return localStorage.getItem("verso-editor-fullwidth") === "true";
    } catch {
      return false;
    }
  });

  const toggleFullWidth = useCallback(() => {
    setFullWidth((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem("verso-editor-fullwidth", String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleContentClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      if (!editor || !editable) {
        return;
      }
      const target = e.target as HTMLElement;
      const proseEl = contentRef.current;
      if (!proseEl) {
        return;
      }
      if (target === proseEl || !proseEl.contains(target)) {
        editor.commands.focus("end");
      }
    },
    [editor, editable],
  );

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) {
      return "";
    }
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) {
      return "just now";
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  markDirtyRef.current = markDirty;

  const previousContentJsonRef = useRef(contentJson);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (previousContentJsonRef.current === contentJson) {
      return;
    }
    previousContentJsonRef.current = contentJson;
    editor.commands.setContent(content);
  }, [content, contentJson, editor]);

  useEffect(() => {
    setHeadings(extractEditorHeadings(content));
  }, [content]);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    return () => setIsDeleting(false);
  }, [isDeleting]);

  useEffect(
    () => () => {
      setIsDeleting(false);
    },
    [],
  );

  useEffect(() => {
    if (!tocOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTocOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tocOpen]);

  useEffect(() => {
    if (headings.length === 0) {
      setActiveHeadingId(null);
      return;
    }

    const container = contentRef.current;
    if (!container) {
      return;
    }

    const headingElements = headings
      .map((heading) => container.querySelector<HTMLElement>(`#${safeCssEscape(heading.id)}`))
      .filter((element): element is HTMLElement => element !== null);

    if (headingElements.length === 0) {
      setActiveHeadingId(headings[0]?.id ?? null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeadings = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const nextActive = visibleHeadings[0]?.target.id ?? null;
        if (nextActive) {
          setActiveHeadingId(nextActive);
        }
      },
      {
        root: container,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0.1,
      },
    );

    for (const element of headingElements) {
      observer.observe(element);
    }

    if (!activeHeadingId) {
      setActiveHeadingId(headingElements[0]?.id ?? null);
    }

    return () => observer.disconnect();
  }, [activeHeadingId, headings]);

  const handleSelectHeading = useCallback((id: string) => {
    const el = wrapperRef.current?.querySelector<HTMLElement>(`#${safeCssEscape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTocOpen(false);
  }, []);

  const effectiveEditable = editable && !isDeleting;

  if (!editor) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative h-full flex flex-col pb-16">
      <div className="flex items-center justify-between pt-1.5 pb-1 pl-4 pr-4 shrink-0">
        <div className="group relative">
          <span
            className={`text-[11px] lowercase font-medium ${t("text-text-dark/30", "text-text-light/30")}`}
          >
            {title}
          </span>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden group-hover:block">
            <div
              className={`relative whitespace-nowrap px-2 py-1 text-[10px] ${t("bg-neutral-800 text-white", "bg-neutral-200 text-black")}`}
            >
              {title}
              <div
                className={`absolute left-2 bottom-full h-1 w-1 rotate-45 ${t("bg-neutral-800", "bg-neutral-200")}`}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {effectiveEditable && (
            <span
              className={`text-[11px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}
            >
              {(() => {
                if (isSaving) {
                  return "saving...";
                }
                if (dirty) {
                  return "unsaved changes";
                }
                if (!lastSaved) {
                  return "saved";
                }
                return `saved ${formatTimeAgo(lastSaved)}`;
              })()}
            </span>
          )}
          <button
            aria-label={isFaved ? "Unfavorite page" : "Favorite page"}
            aria-pressed={isFaved}
            className={`p-0.5 transition-colors ${isFaved ? "text-yellow-400" : t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
            onClick={() => toggleFav.mutate(pageId)}
            type="button"
          >
            <BookmarkSimpleIcon size={14} weight={isFaved ? "fill" : "regular"} />
          </button>
          <button
            aria-label="Open table of contents"
            className={`p-0.5 transition-colors ${tocOpen ? t("text-text-dark", "text-text-light") : t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
            onClick={() => setTocOpen((prev) => !prev)}
            type="button"
          >
            <ListBulletsIcon size={14} />
          </button>
          <EditorMoreMenu
            pageId={pageId}
            title={title}
            spaceName={spaceName}
            spaceSlug={spaceSlug}
            creatorId={creatorId}
            createdAt={createdAt}
            updatedAt={updatedAt}
            textContent={textContent}
            fullWidth={fullWidth}
            onDeleteStart={() => {
              setIsDeleting(true);
              onDeleteStart?.();
            }}
            onDeleteSettled={() => setIsDeleting(false)}
            onToggleFullWidth={toggleFullWidth}
            isWatching={isWatching}
            onToggleWatch={() =>
              watchPage.mutate(pageId, {
                onSuccess: (data) => {
                  setFlashToast(data.watching ? "watching page" : "stopped watching");
                },
              })
            }
            watchPending={watchPage.isPending}
          />
        </div>
      </div>

      {effectiveEditable && <BubbleMenu editor={editor} />}

      <div
        ref={contentRef}
        className={`w-full px-4 blog-reader-prose flex-1 min-h-0 overflow-y-auto ${fullWidth ? "" : "mx-auto max-w-2xl"}`}
        onClick={handleContentClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleContentClick(e);
          }
        }}
        aria-label="page content"
        aria-multiline="true"
        role="textbox"
        tabIndex={0}
      >
        <EditorContent editor={editor} />
      </div>

      {tocOpen && (
        <div className="fixed inset-0 z-80" role="dialog" aria-modal="true">
          <button
            aria-label="Close table of contents"
            className="absolute inset-0 bg-black/40"
            onClick={() => setTocOpen(false)}
            type="button"
          />
          <div
            className={`absolute right-0 top-0 flex h-full w-[min(92vw,18rem)] flex-col border-l shadow-2xl ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
          >
            <div
              className={`flex items-center justify-between border-b px-3 py-2 ${t("border-border-dark", "border-border-light")}`}
            >
              <div>
                <p
                  className={`text-[11px] uppercase tracking-[0.18em] ${t("text-text-dark/45", "text-text-light/45")}`}
                >
                  table of contents
                </p>
                <p
                  className={`text-[10px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}
                >
                  on this page
                </p>
              </div>
              <button
                aria-label="Close table of contents"
                className={`p-0.5 ${t("text-text-dark/50 hover:text-text-dark", "text-text-light/50 hover:text-text-light")}`}
                onClick={() => setTocOpen(false)}
                type="button"
              >
                <XIcon size={12} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {headings.length > 0 ? (
                <BlogTableOfContents
                  activeHeadingId={activeHeadingId}
                  headings={headings}
                  isDarkMode={isDarkMode}
                  onSelect={handleSelectHeading}
                  compact
                />
              ) : (
                <p
                  className={`text-[11px] lowercase ${t("text-text-dark/35", "text-text-light/35")}`}
                >
                  no headings yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
