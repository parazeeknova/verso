import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { BookmarkSimpleIcon, InfoIcon, ListBulletsIcon, XIcon } from "@phosphor-icons/react";
import { gsap } from "gsap";

import { useTheme } from "#/shared/hooks/use-theme";
import { getEditorExtensions } from "#/features/editor/extensions";
import { useEditorContent } from "#/features/editor/hooks/use-editor-content";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useQueryClient } from "@tanstack/react-query";
import { EditorMoreMenu } from "#/features/editor/components/editor-more-menu";
import {
  useIsPageFavorited,
  useTogglePageFavorite,
} from "#/features/console/hooks/use-page-favorites";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { useIsPageWatching, useWatchPage } from "#/features/console/hooks/use-page-watches";
import { TableMenu } from "./table/table-menu";
import { ColumnsMenu } from "./columns/columns-menu";
import { CalloutMenu } from "./callout/callout-menu";
import { TableHandlesLayer } from "./table/handle/table-handles-layer";
import { BlogTableOfContents } from "#/features/blog/components/blog-table-of-contents";
import type { BlogHeading } from "#/features/blog/lib/blog-headings";
import { extractEditorHeadings } from "#/features/editor/lib/editor-headings";
import type { PageEditorProps } from "#/features/editor/types/editor.types";
import { useUserById } from "#/features/console/hooks/use-users";
import { AvatarBadge } from "#/shared/components/avatar-badge";

const parseContent = (raw: string): JSONContent => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "doc" &&
      Array.isArray(parsed.content)
    ) {
      return parsed as JSONContent;
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

const getInitialFullWidth = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    return localStorage.getItem("verso-editor-fullwidth") === "true";
  } catch {
    return false;
  }
};

const saveFullWidth = (next: boolean) => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem("verso-editor-fullwidth", String(next));
    } catch {
      // ignore
    }
  }
};

const formatTimeAgo = (date: Date | null, now: Date) => {
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

const getSaveStatusText = (
  isSaving: boolean,
  dirty: boolean,
  lastSaved: Date | null,
  now: Date,
) => {
  if (isSaving) {
    return "saving...";
  }
  if (dirty) {
    return "unsaved changes";
  }
  if (!lastSaved) {
    return "saved";
  }
  return `saved ${formatTimeAgo(lastSaved, now)}`;
};

const setupActiveHeadingObserver = (
  container: HTMLElement | null,
  headings: BlogHeading[],
  hasCheckedInitialRef: React.RefObject<boolean | null>,
  setActiveHeadingId: (id: string | null) => void,
) => {
  if (!container || headings.length === 0) {
    setActiveHeadingId(null);
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

  if (!hasCheckedInitialRef.current) {
    hasCheckedInitialRef.current = true;
    setActiveHeadingId(headingElements[0]?.id ?? null);
  }

  return () => observer.disconnect();
};

const handleTitleKeyPress = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  titleRef: React.RefObject<HTMLTextAreaElement | null>,
  localTitle: string,
  setLocalTitle: (val: string) => void,
  saveTitle: (val: string) => void,
  editor: Editor,
) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const el = titleRef.current;
    if (!el) {
      return;
    }
    const { selectionStart } = el;
    const titleText = localTitle;
    const textBeforeCursor = titleText.slice(0, selectionStart);
    const textAfterCursor = titleText.slice(selectionStart);

    setLocalTitle(textBeforeCursor);
    void saveTitle(textBeforeCursor);

    editor
      .chain()
      .command(({ tr }) => {
        tr.setMeta("addToHistory", false);
        return true;
      })
      .insertContentAt(0, {
        content: textAfterCursor ? [{ text: textAfterCursor, type: "text" }] : undefined,
        type: "paragraph",
      })
      .focus("start")
      .run();

    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    editor.commands.focus("start");
  }
};

const usePageTitle = (title: string, pageId: string) => {
  const queryClient = useQueryClient();
  const [localTitle, setLocalTitle] = useState(title);
  const lastSavedTitleRef = useRef(title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const localTitleRef = useRef(localTitle);

  useEffect(() => {
    localTitleRef.current = localTitle;
  }, [localTitle]);

  useEffect(() => {
    setLocalTitle(title);
    lastSavedTitleRef.current = title;
  }, [title]);

  const debounceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTitle = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed === lastSavedTitleRef.current) {
        return;
      }
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
        debounceSaveRef.current = null;
      }
      try {
        await fetchProtected(`/api/console/pages/${pageId}`, {
          body: JSON.stringify({ title: trimmed }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });
        lastSavedTitleRef.current = trimmed;
        await queryClient.invalidateQueries({ queryKey: ["consolePage"] });
        await queryClient.invalidateQueries({ queryKey: ["consolePages"] });
        await queryClient.invalidateQueries({ queryKey: ["pageTree"] });
      } catch (error) {
        console.error("failed to save title:", error);
      }
    },
    [pageId, queryClient],
  );

  const handleTitleChange = (newVal: string) => {
    setLocalTitle(newVal);
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    debounceSaveRef.current = setTimeout(() => {
      void saveTitle(newVal);
    }, 1000);
  };

  const handleTitleBlur = () => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    void saveTitle(localTitle);
  };

  const adjustTitleHeight = () => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTitleHeight();
  }, [localTitle]);

  useEffect(
    () => () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
      }
      void saveTitle(localTitleRef.current);
    },
    [saveTitle],
  );

  return {
    handleTitleBlur,
    handleTitleChange,
    localTitle,
    saveTitle,
    setLocalTitle,
    titleRef,
  };
};

const usePageEditorInstance = (
  content: JSONContent,
  editable: boolean,
  setHeadings: (headings: BlogHeading[]) => void,
  markDirtyRef: React.MutableRefObject<(() => void) | null>,
) => {
  const editableRef = useRef(editable);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);

  return useEditor({
    content,
    editable,
    editorProps: {
      attributes: {
        class: "outline-none border-none focus:outline-none focus:border-none focus:ring-0",
      },
    },
    extensions: getEditorExtensions(),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const liveContent = editor.getJSON();
      if (liveContent) {
        setHeadings(extractEditorHeadings(liveContent));
      }
      if (editableRef.current) {
        markDirtyRef.current?.();
      }
    },
  });
};

const useSyncEditorContent = (
  editor: Editor | null,
  content: JSONContent,
  contentJson: string,
  dirty: boolean,
) => {
  const previousContentJsonRef = useRef(contentJson);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (previousContentJsonRef.current === contentJson) {
      return;
    }
    if (dirty || editor.isFocused) {
      return;
    }
    previousContentJsonRef.current = contentJson;
    editor.commands.setContent(content);
  }, [content, contentJson, editor, dirty]);
};

const useEscapeKeyListener = (isOpen: boolean, setIsOpen: (open: boolean) => void) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);
};

interface CreatorInfo {
  avatar_url?: string | null;
  name?: string | null;
  username?: string | null;
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) {
    return "";
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const datePart = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
};

const CreatorByline = ({
  creator,
  t,
}: {
  creator: CreatorInfo | null | undefined;
  t: (dark: string, light: string) => string;
}) => {
  if (!creator) {
    return null;
  }

  const displayName = creator.name || creator.username || "creator";

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] mb-2 ${t("text-text-dark/40", "text-text-light/40")}`}
    >
      <AvatarBadge
        icon={creator.avatar_url}
        name={displayName}
        className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center rounded-full"
        initialsClass="text-[10px] text-neutral-600 dark:text-neutral-300 font-semibold"
      />
      <span>by {displayName}</span>
    </div>
  );
};

const PageDetailsPanel = ({
  creator,
  spaceName,
  createdAt,
  updatedAt,
  wordCount,
  characterCount,
  readingTime,
  t,
  onClose,
  isOpen,
}: {
  creator: CreatorInfo | null | undefined;
  spaceName?: string;
  createdAt?: string;
  updatedAt?: string;
  wordCount: number;
  characterCount: number;
  readingTime: number;
  t: (dark: string, light: string) => string;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const displayName = creator?.name || creator?.username || "creator";
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.set(backdropRef.current, { opacity: 0 });
    gsap.set(panelRef.current, { x: "100%" });
    gsap.set(containerRef.current, { display: "none" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.set(containerRef.current, { display: "block" });
      gsap.to(backdropRef.current, {
        duration: 0.25,
        ease: "power2.out",
        opacity: 1,
      });
      gsap.to(panelRef.current, {
        duration: 0.3,
        ease: "power2.out",
        x: "0%",
      });
    } else {
      gsap.to(backdropRef.current, {
        duration: 0.2,
        ease: "power2.in",
        opacity: 0,
      });
      gsap.to(panelRef.current, {
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(containerRef.current, { display: "none" });
        },
        x: "100%",
      });
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 pointer-events-none">
      <button
        ref={backdropRef}
        className="absolute inset-0 bg-black/10 dark:bg-black/30 pointer-events-auto md:hidden"
        onClick={onClose}
        type="button"
        aria-label="Close details"
      />
      <div
        ref={panelRef}
        className={`absolute top-0 right-0 h-full w-full sm:w-64 border-l p-4 flex flex-col shadow-xl pointer-events-auto ${t(
          "bg-neutral-900 border-neutral-800 text-neutral-200",
          "bg-white border-neutral-200 text-neutral-800",
        )}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-[10px] font-bold tracking-wider uppercase ${t("text-neutral-500", "text-neutral-400")}`}
          >
            page info
          </h3>
          <button
            aria-label="Close page info"
            className={`p-0.5 rounded-sm transition-colors ${t(
              "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800",
              "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100",
            )}`}
            onClick={onClose}
            type="button"
          >
            <XIcon size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 text-[11px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={t("text-neutral-500", "text-neutral-400")}>author</span>
              <div className="flex items-center gap-1 font-medium">
                <AvatarBadge
                  icon={creator?.avatar_url}
                  name={displayName}
                  className="w-4.5 h-4.5 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center rounded-full"
                  initialsClass="text-[9px] text-neutral-600 dark:text-neutral-300 font-semibold"
                />
                <span>{displayName}</span>
              </div>
            </div>

            {spaceName && (
              <div className="flex items-center justify-between">
                <span className={t("text-neutral-500", "text-neutral-400")}>space</span>
                <span className="font-medium">{spaceName}</span>
              </div>
            )}
          </div>

          <hr className={`border-t ${t("border-neutral-800", "border-neutral-200")}`} />

          <div className="space-y-2.5">
            {createdAt && (
              <div className="flex flex-col gap-0.5">
                <span className={t("text-neutral-500", "text-neutral-400")}>created</span>
                <span className="font-medium text-[10.5px]">{formatDateTime(createdAt)}</span>
              </div>
            )}
            {updatedAt && (
              <div className="flex flex-col gap-0.5">
                <span className={t("text-neutral-500", "text-neutral-400")}>last modified</span>
                <span className="font-medium text-[10.5px]">{formatDateTime(updatedAt)}</span>
              </div>
            )}
          </div>

          <hr className={`border-t ${t("border-neutral-800", "border-neutral-200")}`} />

          <div className="space-y-2">
            <h4
              className={`text-[10px] font-bold uppercase tracking-wider ${t("text-neutral-500", "text-neutral-400")}`}
            >
              metrics
            </h4>
            <div className="flex items-center justify-between">
              <span className={t("text-neutral-500", "text-neutral-400")}>words</span>
              <span className="font-semibold tabular-nums">{wordCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={t("text-neutral-500", "text-neutral-400")}>characters</span>
              <span className="font-semibold tabular-nums">{characterCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={t("text-neutral-500", "text-neutral-400")}>reading time</span>
              <span className="font-semibold">{readingTime} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TableOfContentsModal = ({
  tocOpen,
  setTocOpen,
  t,
  headings,
  activeHeadingId,
  isDarkMode,
  handleSelectHeading,
}: {
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
  t: (dark: string, light: string) => string;
  headings: BlogHeading[];
  activeHeadingId: string | null;
  isDarkMode: boolean;
  handleSelectHeading: (id: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.set(backdropRef.current, { opacity: 0 });
    gsap.set(sidebarRef.current, { x: "100%" });
    gsap.set(containerRef.current, { display: "none" });
  }, []);

  useEffect(() => {
    if (tocOpen) {
      gsap.set(containerRef.current, { display: "block" });
      gsap.to(backdropRef.current, {
        duration: 0.25,
        ease: "power2.out",
        opacity: 1,
      });
      gsap.to(sidebarRef.current, {
        duration: 0.3,
        ease: "power2.out",
        x: "0%",
      });
    } else {
      gsap.to(backdropRef.current, {
        duration: 0.2,
        ease: "power2.in",
        opacity: 0,
      });
      gsap.to(sidebarRef.current, {
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(containerRef.current, { display: "none" });
        },
        x: "100%",
      });
    }
  }, [tocOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-80 pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      <button
        ref={backdropRef}
        aria-label="Close table of contents"
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={() => setTocOpen(false)}
        type="button"
      />
      <div
        ref={sidebarRef}
        className={`absolute right-0 top-0 flex h-full w-[min(92vw,18rem)] flex-col border-l shadow-2xl pointer-events-auto ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
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
            <p className={`text-[10px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
              on this page
            </p>
          </div>
          <button
            aria-label="Close table of contents"
            className={`p-0.5 rounded-sm transition-colors ${t(
              "text-text-dark/40 hover:text-text-dark hover:bg-white/5",
              "text-text-light/40 hover:text-text-light hover:bg-black/5",
            )}`}
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
            <p className={`text-[11px] lowercase ${t("text-text-dark/35", "text-text-light/35")}`}>
              no headings yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const useThemeTranslator = (isDarkMode: boolean) =>
  useCallback((dark: string, light: string) => (isDarkMode ? dark : light), [isDarkMode]);

const useContentClickHandler = (
  editor: Editor | null,
  editable: boolean,
  contentRef: React.RefObject<HTMLDivElement | null>,
) =>
  useCallback(
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
    [editor, editable, contentRef],
  );

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
  const t = useThemeTranslator(isDarkMode);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const content = useMemo(() => parseContent(contentJson), [contentJson]);
  const [tocOpen, setTocOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<BlogHeading[]>(() => extractEditorHeadings(content));

  const { data: creator } = useUserById(creatorId ?? "");
  const { handleTitleBlur, handleTitleChange, localTitle, saveTitle, setLocalTitle, titleRef } =
    usePageTitle(title, pageId);

  const markDirtyRef = useRef<(() => void) | null>(null);

  const editor = usePageEditorInstance(content, editable, setHeadings, markDirtyRef);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const storage = editor.storage as unknown as Record<
        string,
        Record<string, string | undefined>
      >;
      storage.shared = storage.shared || {};
      storage.shared.pageId = pageId;
      storage.shared.spaceName = spaceName;
      storage.shared.pageName = title;
    }
  }, [editor, pageId, spaceName, title]);

  const { dirty, cleanup, isSaving, lastSaved, markDirty } = useEditorContent(editor, pageId);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editor || !editable) {
      return;
    }
    handleTitleKeyPress(e, titleRef, localTitle, setLocalTitle, saveTitle, editor);
  };

  const { data: favData } = useIsPageFavorited(pageId);
  const toggleFav = useTogglePageFavorite();
  const isFaved = favData?.favorited ?? false;
  const { data: watchData } = useIsPageWatching(pageId);
  const watchPage = useWatchPage();
  const isWatching = watchData?.watching ?? false;

  const [fullWidth, setFullWidth] = useState(getInitialFullWidth);

  const toggleFullWidth = useCallback(() => {
    setFullWidth((prev) => {
      const next = !prev;
      saveFullWidth(next);
      return next;
    });
  }, []);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleContentClick = useContentClickHandler(editor, editable, contentRef);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  markDirtyRef.current = markDirty;

  useSyncEditorContent(editor, content, contentJson, dirty);

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

  useEscapeKeyListener(tocOpen, setTocOpen);

  const hasCheckedInitialActiveIdRef = useRef(false);

  useEffect(() => {
    hasCheckedInitialActiveIdRef.current = false;
  }, [headings]);

  useEffect(
    () =>
      setupActiveHeadingObserver(
        contentRef.current,
        headings,
        hasCheckedInitialActiveIdRef,
        setActiveHeadingId,
      ),
    [headings],
  );

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

  const effectiveText = editor.getText() || textContent || "";
  const derivedWordCount = effectiveText.trim()
    ? effectiveText.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const derivedCharCount = effectiveText.length;
  const derivedReadingTime = Math.max(1, Math.ceil(derivedWordCount / 200));

  return (
    <div ref={wrapperRef} className="relative h-full flex flex-col pb-16">
      <div className="flex items-center justify-between pt-1.5 pb-1 pl-4 pr-4 shrink-0">
        <div className="group relative">
          <span
            className={`text-[11px] lowercase font-medium ${t("text-text-dark/30", "text-text-light/30")}`}
          >
            {localTitle}
          </span>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden group-hover:block">
            <div
              className={`relative whitespace-nowrap px-2 py-1 text-[10px] ${t("bg-neutral-800 text-white", "bg-neutral-200 text-black")}`}
            >
              {localTitle}
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
              {getSaveStatusText(isSaving, dirty, lastSaved, now)}
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
          <button
            aria-label="Page details"
            className={`p-0.5 transition-colors ${detailsOpen ? t("text-text-dark", "text-text-light") : t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
            onClick={() => setDetailsOpen((prev) => !prev)}
            type="button"
          >
            <InfoIcon size={14} />
          </button>
          <EditorMoreMenu
            pageId={pageId}
            title={localTitle}
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

      <div
        ref={contentRef}
        className={`w-full blog-reader-prose flex-1 min-h-0 overflow-y-auto ${fullWidth ? "px-8 md:px-16 lg:px-24" : "px-4 mx-auto max-w-2xl"}`}
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
        <textarea
          ref={titleRef}
          rows={1}
          className={`w-full resize-none overflow-hidden bg-transparent text-4xl font-bold border-none outline-none focus:outline-none focus:border-none focus:ring-0 pt-8 pb-0 px-0 mb-0.5 font-sans tracking-tight leading-tight ${t("text-neutral-200 placeholder-neutral-700", "text-neutral-800 placeholder-neutral-300")}`}
          placeholder="Untitled"
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          disabled={!editable}
        />
        <CreatorByline creator={creator} t={t} />
        <EditorContent editor={editor} />
        {editor && editable && (
          <>
            <TableMenu editor={editor} />
            <ColumnsMenu editor={editor} />
            <CalloutMenu editor={editor} />
            <TableHandlesLayer editor={editor} />
          </>
        )}
      </div>

      <PageDetailsPanel
        creator={creator}
        spaceName={spaceName}
        createdAt={createdAt}
        updatedAt={updatedAt}
        wordCount={derivedWordCount}
        characterCount={derivedCharCount}
        readingTime={derivedReadingTime}
        t={t}
        onClose={() => setDetailsOpen(false)}
        isOpen={detailsOpen}
      />

      <TableOfContentsModal
        tocOpen={tocOpen}
        setTocOpen={setTocOpen}
        t={t}
        headings={headings}
        activeHeadingId={activeHeadingId}
        isDarkMode={isDarkMode}
        handleSelectHeading={handleSelectHeading}
      />
    </div>
  );
};
