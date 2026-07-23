import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  BookmarkSimpleIcon,
  InfoIcon,
  ListBulletsIcon,
  XIcon,
  PencilSimpleIcon,
  EyeIcon,
  CheckIcon,
  CopyIcon,
  ArrowSquareOutIcon,
  WifiHighIcon,
  WifiSlashIcon,
  UsersIcon,
  ChatCircleDotsIcon,
} from "@phosphor-icons/react";
import { CommentSidebar, CommentDialog } from "#/features/comment";
import { BubbleMenu } from "./toolbar/bubble-menu";
import { gsap } from "gsap";
import { useTheme } from "#/shared/hooks/use-theme";
import type { WebsocketProvider } from "y-websocket";
import {
  getEditorExtensions,
  getCollabEditorExtensions,
  getRandomColor,
} from "#/features/editor/extensions";
import { useCollabToken } from "#/features/auth/hooks/use-collab-token";
import { useCollaborationUrl } from "#/features/editor/hooks/use-collaboration-url";
import { useEditorContent } from "#/features/editor/hooks/use-editor-content";
import { usePresenceApi } from "#/features/editor/hooks/use-presence-api";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useQueryClient } from "@tanstack/react-query";
import { EditorMoreMenu } from "#/features/editor/components/editor-more-menu";
import { SharePopover } from "./share-popover";
import { PageHistoryModal } from "./page-history-modal";
import { useAuth } from "#/features/auth/hooks/use-auth";
import {
  useIsPageFavorited,
  useTogglePageFavorite,
} from "#/features/console/hooks/use-page-favorites";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { useIsPageWatching, useWatchPage } from "#/features/console/hooks/use-page-watches";
import { useUpdatePage, usePageShare } from "#/features/console/hooks/use-pages";
import { getGuestPokemon, getPokemonDetails } from "#/features/editor/lib/pokemon-avatars";
import type { CollaboratorAwarenessUser } from "#/features/editor/lib/collaboration-presence";
import { TableMenu } from "./table/table-menu";
import { ColumnsMenu } from "./columns/columns-menu";
import { CalloutMenu } from "./callout/callout-menu";
import { ImageMenu } from "./image/image-menu";
import { handleCopy } from "../lib/clipboard";
import { VideoMenu } from "./video/video-menu";
import { AudioMenu } from "./audio/audio-menu";
import { PdfMenu } from "./pdf/pdf-menu";
import { YoutubeMenu } from "./youtube/youtube-menu";
import { TableHandlesLayer } from "./table/handle/table-handles-layer";
import { BlogTableOfContents } from "#/features/blog/components/blog-table-of-contents";
import type { BlogHeading } from "#/features/blog/lib/blog-headings";
import { extractEditorHeadings } from "#/features/editor/lib/editor-headings";
import type { PageEditorProps } from "#/features/editor/types/editor.types";
import { useUserById } from "#/features/console/hooks/use-users";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import { createCollaborationProvider } from "../lib/collaboration-provider";

const parseContent = (raw: unknown): JSONContent => {
  if (!raw) {
    return { content: [], type: "doc" };
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as Record<string, unknown>).type === "doc" &&
      Array.isArray((parsed as Record<string, unknown>).content)
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

const usePageTitle = (title: string, pageId: string, options?: { enabled?: boolean }) => {
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
      if (trimmed === lastSavedTitleRef.current || options?.enabled === false) {
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
    [pageId, queryClient, options?.enabled],
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
  provider?: WebsocketProvider | null,
  user?: CollaboratorAwarenessUser,
) => {
  const editableRef = useRef(editable);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);

  const extensions = useMemo(() => {
    if (provider) {
      return getCollabEditorExtensions(provider, user);
    }
    return getEditorExtensions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  return useEditor(
    {
      content: provider ? undefined : content,
      editable,
      editorProps: {
        attributes: {
          class: "outline-none border-none focus:outline-none focus:border-none focus:ring-0",
        },
      },
      extensions,
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
    },
    [editable, extensions, provider],
  );
};

const useSyncEditorContent = (
  editor: Editor | null,
  content: JSONContent,
  contentJson: string,
  dirty: boolean,
  providerReady: boolean,
) => {
  const previousContentJsonRef = useRef(contentJson);

  useEffect(() => {
    if (!editor || providerReady) {
      return;
    }
    if (previousContentJsonRef.current === contentJson) {
      return;
    }
    const localJsonString = JSON.stringify(editor.getJSON());
    if (localJsonString === contentJson) {
      previousContentJsonRef.current = contentJson;
      return;
    }
    if (dirty || editor.isFocused) {
      return;
    }
    previousContentJsonRef.current = contentJson;
    editor.commands.setContent(content);
  }, [content, contentJson, editor, dirty, providerReady]);
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

const MergedConnectionStatus = ({
  collabStatus,
  t,
}: {
  collabStatus: CollaborationStatus;
  t: (dark: string, light: string) => string;
}) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isWsConnected = collabStatus === "connected";
  const isWsConnecting = collabStatus === "connecting";

  let badgeStyle = t(
    "border-neutral-700 text-neutral-400 hover:text-neutral-200",
    "border-neutral-300 text-neutral-600 hover:text-neutral-800",
  );

  if (isOnline && isWsConnected) {
    badgeStyle =
      "border-purple-500/30 text-purple-500 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20";
  } else if (isOnline && isWsConnecting) {
    badgeStyle = "border-amber-500/30 text-amber-500 bg-amber-500/10 animate-pulse";
  }

  let wsTextColor = "text-neutral-400";
  let wsTextLabel = "disconnected";

  if (isWsConnected) {
    wsTextColor = "text-purple-500 dark:text-purple-400";
    wsTextLabel = "connected";
  } else if (isWsConnecting) {
    wsTextColor = "text-amber-500";
    wsTextLabel = "connecting";
  }

  let wsIconColor = "opacity-40 text-neutral-400";
  if (isWsConnected) {
    wsIconColor = "text-purple-500 dark:text-purple-400";
  } else if (isWsConnecting) {
    wsIconColor = "text-amber-500 animate-pulse";
  }

  return (
    <div ref={dropdownRef} className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-1.5 py-0.5 border transition-all cursor-pointer ${badgeStyle}`}
        aria-label="Connection Status"
      >
        {isOnline ? <WifiHighIcon size={12} /> : <WifiSlashIcon size={12} />}
        <UsersIcon size={12} className={wsIconColor} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-1 z-50 w-44 p-1.5 shadow-lg border text-[10px] font-mono lowercase space-y-1 transition-all ${t(
            "bg-neutral-900 border-neutral-800 text-neutral-200",
            "bg-white border-neutral-200 text-neutral-800",
          )}`}
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-border-light dark:border-border-dark">
            <span className="font-bold text-[9px] uppercase tracking-wider text-neutral-400">
              sync status
            </span>
          </div>

          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="flex items-center gap-1 opacity-70">
              {isOnline ? <WifiHighIcon size={11} /> : <WifiSlashIcon size={11} />}
              network
            </span>
            <span
              className={`text-[9px] ${isOnline ? "text-purple-500 dark:text-purple-400" : "text-red-500"}`}
            >
              {isOnline ? "online" : "offline"}
            </span>
          </div>

          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="flex items-center gap-1 opacity-70">
              <UsersIcon size={11} className={wsTextColor} />
              collab
            </span>
            <span className={`text-[9px] ${wsTextColor}`}>{wsTextLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActiveCollaborator {
  clientId: number | string;
  id?: string;
  isGuest?: boolean;
  name: string;
  avatar_url?: string | null;
  color?: string;
}

type CollaborationStatus = "connected" | "connecting" | "disconnected";

const CollaboratorAvatar = ({
  initials,
  t,
  user,
}: {
  initials: string;
  t: (dark: string, light: string) => string;
  user: ActiveCollaborator;
}) => {
  const pokemonInfo = getPokemonDetails(user.avatar_url || user.name);
  const avatarUrl = user.avatar_url || pokemonInfo?.avatar;
  const isPokemon =
    user.isGuest ||
    user.id?.startsWith("guest-") ||
    user.name.includes("(Guest)") ||
    Boolean(pokemonInfo) ||
    Boolean(
      avatarUrl && (avatarUrl.includes("pokemon") || avatarUrl.includes("githubusercontent")),
    );

  if (avatarUrl && isPokemon) {
    return (
      <div
        className={`h-5 w-5 flex items-center justify-center overflow-hidden ring-2 p-0.5 bg-neutral-800/90 dark:bg-neutral-900/90 ${t(
          "ring-neutral-900 border border-neutral-700/60",
          "ring-white border border-neutral-300",
        )}`}
      >
        <img
          src={avatarUrl}
          alt={user.name}
          className="h-3.5 w-3.5 object-contain grayscale transition-all duration-200 group-hover:scale-110"
        />
      </div>
    );
  }

  if (user.avatar_url) {
    return (
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center overflow-hidden ring-2 p-0.5 bg-neutral-500 ${t(
          "ring-neutral-900 border border-neutral-600",
          "ring-white border border-neutral-400",
        )}`}
      >
        <img
          src={user.avatar_url}
          alt={user.name}
          className="h-full w-full object-cover transition-all duration-200"
        />
      </div>
    );
  }

  return (
    <div
      className={`h-5 w-5 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white ring-2 bg-neutral-500 ${t(
        "ring-neutral-900",
        "ring-white",
      )}`}
    >
      {initials}
    </div>
  );
};

const ActiveCollaboratorsStack = ({
  collaborators,
  t,
}: {
  collaborators: ActiveCollaborator[];
  t: (dark: string, light: string) => string;
}) => {
  if (collaborators.length === 0) {
    return null;
  }

  const maxVisible = 4;
  const visible = collaborators.slice(0, maxVisible);
  const overflowCount = Math.max(0, collaborators.length - maxVisible);

  return (
    <div className="flex items-center -space-x-1.5 pl-1 select-none">
      {visible.map((user, idx) => {
        const initials = user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        const pokemonInfo = getPokemonDetails(user.avatar_url || user.name);
        const isGuest =
          user.isGuest ||
          user.id?.startsWith("guest-") ||
          user.name.includes("(Guest)") ||
          Boolean(pokemonInfo);
        const cleanName = pokemonInfo?.name || user.name.replace(/\s*\(Guest\)$/i, "");

        let subtitle = "Collaborator • Active now";
        if (pokemonInfo) {
          subtitle = `Pokémon #${pokemonInfo.id} • Active guest`;
        } else if (isGuest) {
          subtitle = "Guest collaborator • Active now";
        }

        return (
          <div
            key={`${user.clientId}-${idx}`}
            className="group relative flex items-center justify-center shrink-0"
          >
            <CollaboratorAvatar initials={initials} t={t} user={user} />
            <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 hidden group-hover:flex flex-col items-center select-none animate-in fade-in zoom-in-95 duration-150">
              <div className="w-2 h-2 -mb-1 rotate-45 bg-neutral-900/95 border-l border-t border-neutral-700/60" />
              <div className="flex flex-col gap-1 rounded-none px-2.5 py-1.5 text-xs bg-neutral-900/95 text-white dark:bg-neutral-900/95 dark:text-white border border-neutral-700/60 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-1.5 font-semibold text-[11px] leading-tight whitespace-nowrap">
                  {user.avatar_url || pokemonInfo?.avatar ? (
                    <img
                      src={user.avatar_url || pokemonInfo?.avatar}
                      alt=""
                      className="h-4 w-4 object-contain shrink-0 grayscale"
                    />
                  ) : (
                    <span className="h-2 w-2 bg-purple-400 shrink-0" />
                  )}
                  <span>{cleanName}</span>
                  {isGuest && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-none bg-purple-500/20 text-purple-300 border border-purple-500/30 leading-none">
                      Guest
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] text-neutral-400 font-normal leading-tight whitespace-nowrap flex items-center gap-1">
                  <span>{subtitle}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {overflowCount > 0 && (
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[8.5px] font-bold ring-2 ${t(
            "ring-neutral-900 bg-neutral-500 text-white",
            "ring-white bg-neutral-500 text-white",
          )}`}
          title={`${overflowCount} more collaborator${overflowCount > 1 ? "s" : ""}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

const ShareInfoSection = ({
  pageId,
  isLoggedIn = true,
  t,
}: {
  pageId?: string;
  isLoggedIn?: boolean;
  t: (dark: string, light: string) => string;
}) => {
  const [copied, setCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  const { data: share } = usePageShare(pageId ?? "", { enabled: isLoggedIn });

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicUrl = share?.shareToken ? `${origin}/share/${share.shareToken}` : "";
  const shortUrl = share?.shortCode ? `${origin}/sh/${share.shortCode}` : "";

  return (
    <div className="space-y-1.5">
      <h4
        className={`text-[9px] font-bold uppercase tracking-wider ${t("text-neutral-500", "text-neutral-400")}`}
      >
        share & web
      </h4>
      <div className="flex items-center justify-between gap-2">
        <span className={t("text-neutral-500", "text-neutral-400")}>web access</span>
        <span
          className={`font-semibold text-[9.5px] ${share?.isEnabled ? "text-accent" : t("text-neutral-400", "text-neutral-500")}`}
        >
          {share?.isEnabled ? "shared to web" : "private"}
        </span>
      </div>

      {share?.isEnabled && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className={t("text-neutral-500", "text-neutral-400")}>search indexing</span>
            <span className="font-semibold text-[9.5px]">
              {share.searchIndexing ? "allow" : "disallow"}
            </span>
          </div>

          {publicUrl && (
            <div className="flex flex-col gap-0.5 pt-0.5">
              <span className={t("text-neutral-500", "text-neutral-400")}>public link</span>
              <div
                className={`flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                  "border-neutral-800 bg-black/30 text-neutral-300",
                  "border-neutral-200 bg-neutral-100 text-neutral-700",
                )}`}
              >
                <span className="flex-1 overflow-hidden text-ellipsis">{publicUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(publicUrl, setCopied)}
                  className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                  title="copy link"
                >
                  {copied ? (
                    <CheckIcon className="size-2.5 text-accent" />
                  ) : (
                    <CopyIcon className="size-2.5" />
                  )}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-100 opacity-60 transition-opacity"
                  title="open in new tab"
                >
                  <ArrowSquareOutIcon className="size-2.5" />
                </a>
              </div>
            </div>
          )}

          {shortUrl && (
            <div className="flex flex-col gap-0.5 pt-0.5">
              <span className={t("text-neutral-500", "text-neutral-400")}>short link</span>
              <div
                className={`flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis ${t(
                  "border-neutral-800 bg-black/30 text-neutral-300",
                  "border-neutral-200 bg-neutral-100 text-neutral-700",
                )}`}
              >
                <span className="flex-1 overflow-hidden text-ellipsis">{shortUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(shortUrl, setShortCopied)}
                  className="hover:opacity-100 opacity-60 cursor-pointer transition-opacity"
                  title="copy link"
                >
                  {shortCopied ? (
                    <CheckIcon className="size-2.5 text-accent" />
                  ) : (
                    <CopyIcon className="size-2.5" />
                  )}
                </button>
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-100 opacity-60 transition-opacity"
                  title="open in new tab"
                >
                  <ArrowSquareOutIcon className="size-2.5" />
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PageDetailsPanel = ({
  pageId,
  creator,
  spaceName,
  createdAt,
  updatedAt,
  wordCount,
  characterCount,
  readingTime,
  isLoggedIn = true,
  t,
  onClose,
  isOpen,
}: {
  pageId?: string;
  creator: CreatorInfo | null | undefined;
  spaceName?: string;
  createdAt?: string;
  updatedAt?: string;
  wordCount: number;
  characterCount: number;
  readingTime: number;
  isLoggedIn?: boolean;
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
        className={`absolute top-0 right-0 h-full w-full sm:w-52 border-l p-3 flex flex-col shadow-xl pointer-events-auto ${t(
          "bg-neutral-900 border-neutral-800 text-neutral-200",
          "bg-white border-neutral-200 text-neutral-800",
        )}`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <h3
            className={`text-[9px] font-bold tracking-wider uppercase ${t("text-neutral-500", "text-neutral-400")}`}
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

        <div className="flex-1 overflow-y-auto space-y-3 text-[10px]">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={t("text-neutral-500", "text-neutral-400")}>author</span>
              <div className="flex items-center gap-1 font-medium min-w-0">
                <AvatarBadge
                  icon={creator?.avatar_url}
                  name={displayName}
                  className="w-3.5 h-3.5 shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center rounded-full"
                  initialsClass="text-[7px] text-neutral-600 dark:text-neutral-300 font-semibold"
                />
                <span className="truncate">{displayName}</span>
              </div>
            </div>

            {spaceName && (
              <div className="flex items-center justify-between gap-2">
                <span className={t("text-neutral-500", "text-neutral-400")}>space</span>
                <span className="font-medium truncate">{spaceName}</span>
              </div>
            )}
          </div>

          <hr className={`border-t ${t("border-neutral-800/60", "border-neutral-200/60")}`} />

          <div className="space-y-1.5">
            {createdAt && (
              <div className="flex items-center justify-between gap-2">
                <span className={t("text-neutral-500", "text-neutral-400")}>created</span>
                <span className="font-medium text-[9.5px] font-mono text-right">
                  {formatDateTime(createdAt)}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center justify-between gap-2">
                <span className={t("text-neutral-500", "text-neutral-400")}>modified</span>
                <span className="font-medium text-[9.5px] font-mono text-right">
                  {formatDateTime(updatedAt)}
                </span>
              </div>
            )}
          </div>

          {isLoggedIn && (
            <>
              <hr className={`border-t ${t("border-neutral-800/60", "border-neutral-200/60")}`} />
              <ShareInfoSection pageId={pageId} isLoggedIn={isLoggedIn} t={t} />
            </>
          )}

          <hr className={`border-t ${t("border-neutral-800/60", "border-neutral-200/60")}`} />

          <div className="space-y-1.5">
            <h4
              className={`text-[9px] font-bold uppercase tracking-wider ${t("text-neutral-500", "text-neutral-400")}`}
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
        className={`absolute right-0 top-0 flex h-full w-[min(92vw,18rem)] flex-col border-l shadow-2xl pointer-events-auto ${t(
          "border-border-dark bg-neutral-900 text-neutral-200",
          "border-border-light bg-white text-neutral-800",
        )}`}
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

// eslint-disable-next-line complexity
export const PageEditor = ({
  pageId,
  contentJson,
  editable,
  isLocked,
  title,
  spaceName,
  spaceSlug,
  creatorId,
  createdAt,
  updatedAt,
  textContent,
  isStandaloneShare,
  shareToken,
  onDeleteStart,
}: PageEditorProps) => {
  const { isDarkMode } = useTheme();
  const t = useThemeTranslator(isDarkMode);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const content = useMemo(() => parseContent(contentJson), [contentJson]);
  const [tocOpen, setTocOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<BlogHeading[]>(() => extractEditorHeadings(content));

  const { data: currentUser } = useAuth();
  const isLoggedIn = !!currentUser;

  const { data: creator } = useUserById(creatorId ?? "", { enabled: isLoggedIn });
  const { handleTitleBlur, handleTitleChange, localTitle, saveTitle, setLocalTitle, titleRef } =
    usePageTitle(title, pageId, { enabled: editable });

  const collabUrl = useCollaborationUrl();
  const { data: collabData } = useCollabToken({ enabled: isLoggedIn });
  const [collabStatus, setCollabStatus] = useState<CollaborationStatus>("disconnected");

  const providersRef = useRef<{
    remote: WebsocketProvider;
  } | null>(null);

  const [providerReady, setProviderReady] = useState(false);

  const guestPokemon = useMemo(() => getGuestPokemon(), []);

  const collabUser = useMemo(() => {
    if (currentUser && isLoggedIn) {
      const name = currentUser.name || currentUser.username || currentUser.email || "Member";
      return {
        avatar_url: currentUser.avatar_url || null,
        color: getRandomColor(name),
        id: currentUser.id,
        isGuest: false,
        isOwner: creatorId === currentUser.id,
        name,
      };
    }
    return {
      avatar_url: guestPokemon.avatar,
      color: guestPokemon.color,
      id: `guest-${guestPokemon.name.toLowerCase()}`,
      isGuest: true,
      isOwner: false,
      name: `${guestPokemon.name} (Guest)`,
    };
  }, [creatorId, currentUser, isLoggedIn, guestPokemon]);

  useEffect(() => {
    if (!pageId) {
      return;
    }

    if (providersRef.current) {
      setProviderReady(true);
    } else {
      const documentName = `page.${pageId}`;
      const remote = createCollaborationProvider(collabUrl, documentName, collabData?.token);

      remote.on("status", ({ status }: { status: CollaborationStatus }) => {
        setCollabStatus(status);
      });

      providersRef.current = { remote };
      setProviderReady(true);
    }

    return () => {
      providersRef.current?.remote.destroy();
      providersRef.current = null;
      setProviderReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, collabUrl]);

  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);

  useEffect(() => {
    const provider = providersRef.current?.remote;
    if (!provider || !providerReady || !collabUser) {
      return;
    }

    const { awareness } = provider;
    if (!awareness) {
      return;
    }

    awareness.setLocalStateField("user", {
      avatar_url: collabUser.avatar_url,
      color: collabUser.color || getRandomColor(collabUser.name || collabUser.id),
      id: collabUser.id,
      isGuest: collabUser.isGuest,
      isOwner: collabUser.isOwner,
      name: collabUser.name,
    });

    const updateCollaborators = () => {
      const states = awareness.getStates();
      const list: ActiveCollaborator[] = [];
      for (const [clientId, state] of states.entries()) {
        const u = state.user as CollaboratorAwarenessUser | undefined;
        if (u?.name && clientId !== awareness.clientID) {
          list.push({
            avatar_url: u.avatar_url,
            clientId,
            color: u.color || "#3b82f6",
            id: u.id,
            isGuest: u.isGuest ?? u.id?.startsWith("guest-") ?? u.name?.includes("(Guest)"),
            name: u.name,
          });
        }
      }
      setActiveCollaborators(list);
    };

    updateCollaborators();

    awareness.on("change", updateCollaborators);
    awareness.on("update", updateCollaborators);

    provider.on("status", updateCollaborators);

    return () => {
      awareness.off("change", updateCollaborators);
      awareness.off("update", updateCollaborators);
      provider.off("status", updateCollaborators);
    };
  }, [creatorId, providerReady, collabUser]);

  const { collaborators: restCollaborators } = usePresenceApi(pageId, collabUser, {
    enabled: true,
    shareToken,
  });

  const mergedCollaborators = useMemo(() => {
    const map = new Map<string, ActiveCollaborator>();

    for (const c of activeCollaborators) {
      const key = String(c.id || c.name);
      map.set(key, c);
    }

    for (const c of restCollaborators) {
      const key = String(c.id || c.name);
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          avatar_url: existing.avatar_url || c.avatar_url,
          color: existing.color || c.color,
          isGuest: existing.isGuest ?? c.isGuest,
        });
      } else {
        map.set(key, c);
      }
    }

    return [...map.values()];
  }, [activeCollaborators, restCollaborators]);

  useEffect(() => {
    if (providersRef.current && collabData?.token) {
      providersRef.current.remote.params.token = collabData.token;
    }
  }, [collabData?.token]);

  const markDirtyRef = useRef<(() => void) | null>(null);

  const editor = usePageEditorInstance(
    content,
    editable && !isLocked,
    setHeadings,
    markDirtyRef,
    providerReady ? providersRef.current?.remote : null,
    collabUser,
  );

  const updatePage = useUpdatePage();
  const handleToggleEditMode = useCallback(
    (lockValue: boolean) => {
      updatePage.mutate({
        id: pageId,
        input: { isLocked: lockValue },
      });
    },
    [pageId, updatePage],
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable && !isLocked);
    }
  }, [editor, editable, isLocked]);

  const lastUserStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !collabUser) {
      return;
    }
    const userState = {
      avatar_url: collabUser.avatar_url,
      color: collabUser.color || getRandomColor(collabUser.name || collabUser.id),
      id: collabUser.id,
      isGuest: collabUser.isGuest,
      isOwner: collabUser.isOwner,
      name: collabUser.name,
    };

    const currentStateStr = JSON.stringify(userState);
    if (lastUserStateRef.current !== currentStateStr) {
      lastUserStateRef.current = currentStateStr;

      const caretExt = editor.extensionManager.extensions.find(
        (ext) => ext.name === "collaborationCaret" || ext.name === "collaborationCursor",
      );
      if (caretExt) {
        caretExt.options.user = userState;
      }

      const editorCommands = editor.commands as unknown as Record<
        string,
        (attrs: unknown) => boolean
      >;
      if (typeof editorCommands.updateUser === "function") {
        editorCommands.updateUser(userState);
      } else if (providersRef.current?.remote) {
        providersRef.current.remote.awareness.setLocalStateField("user", userState);
      }
    }
  }, [editor, collabUser, providerReady]);

  if (editor && !editor.isDestroyed) {
    const storage = editor.storage as unknown as Record<string, Record<string, string | undefined>>;
    storage.shared = storage.shared || {};
    storage.shared.pageId = pageId;
    storage.shared.spaceName = spaceName;
    storage.shared.pageName = localTitle;
  }

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const storage = editor.storage as unknown as Record<
        string,
        Record<string, string | undefined>
      >;
      storage.shared = storage.shared || {};
      storage.shared.pageId = pageId;
      storage.shared.spaceName = spaceName;
      storage.shared.pageName = localTitle;
    }
  }, [editor, pageId, spaceName, localTitle]);

  const { dirty, cleanup, isSaving, lastSaved, markDirty, resetDirty } = useEditorContent(
    editor,
    pageId,
    { enabled: isLoggedIn },
  );

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editor || !editable) {
      return;
    }
    handleTitleKeyPress(e, titleRef, localTitle, setLocalTitle, saveTitle, editor);
  };

  const { data: favData } = useIsPageFavorited(pageId, { enabled: isLoggedIn });
  const toggleFav = useTogglePageFavorite();
  const isFaved = favData?.favorited ?? false;
  const { data: watchData } = useIsPageWatching(pageId, { enabled: isLoggedIn });
  const watchPage = useWatchPage();
  const isWatching = watchData?.watching ?? false;

  const [fullWidth, setFullWidth] = useState(getInitialFullWidth);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inlineCommentState, setInlineCommentState] = useState<{ selectedText: string } | null>(
    null,
  );

  const toggleFullWidth = useCallback(() => {
    setFullWidth((prev) => {
      const next = !prev;
      saveFullWidth(next);
      return next;
    });
  }, []);

  const contentRef = useRef<HTMLDivElement>(null);

  const effectiveEditable = editable && !isLocked && !isDeleting;

  const handleOpenInlineComment = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    setInlineCommentState({ selectedText });
  }, [editor]);

  useEffect(() => {
    const handleCommentMarkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(".comment-mark");
      if (target) {
        setCommentsOpen(true);
      }
    };
    const container = contentRef.current;
    container?.addEventListener("click", handleCommentMarkClick);
    return () => {
      container?.removeEventListener("click", handleCommentMarkClick);
    };
  }, []);

  const handleContentClick = useContentClickHandler(editor, effectiveEditable, contentRef);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  markDirtyRef.current = markDirty;

  useSyncEditorContent(editor, content, contentJson, dirty, providerReady);

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
  useEscapeKeyListener(detailsOpen, setDetailsOpen);
  useEscapeKeyListener(historyOpen, setHistoryOpen);

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
    <div ref={wrapperRef} className="relative h-full flex flex-col overflow-hidden">
      <div
        className={`sticky top-0 z-30 flex items-center justify-between gap-2 pt-1.5 pb-1 pl-4 pr-4 shrink-0 transition-colors duration-500 ease-out ${t("bg-bg-dark", "bg-bg-light")}`}
      >
        <div className="group relative min-w-0 flex-1">
          <span
            className={`text-[11px] lowercase font-medium truncate block ${t("text-text-dark/30", "text-text-light/30")}`}
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
              className={`text-[11px] lowercase hidden sm:inline ${t("text-text-dark/40", "text-text-light/40")}`}
            >
              {getSaveStatusText(isSaving, dirty, lastSaved, now)}
            </span>
          )}
          {editable && (
            <div
              className={`hidden sm:flex items-center gap-0.5 p-0 rounded-none border ${t("bg-neutral-800/10 border-border-dark", "bg-neutral-100 border-border-light")}`}
            >
              <button
                type="button"
                onClick={() => handleToggleEditMode(false)}
                className={`flex items-center gap-1 px-1.5 py-0 rounded-none text-[10px] lowercase font-medium leading-none transition-all cursor-pointer ${
                  isLocked
                    ? t(
                        "text-text-dark/40 hover:text-text-dark/80",
                        "text-text-light/40 hover:text-text-light/80",
                      )
                    : t(
                        "bg-white/10 text-text-dark shadow-sm",
                        "bg-white text-text-light shadow-sm",
                      )
                }`}
              >
                <PencilSimpleIcon size={10} />
                <span>edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleEditMode(true)}
                className={`flex items-center gap-1 px-1.5 py-0 rounded-none text-[10px] lowercase font-medium leading-none transition-all cursor-pointer ${
                  isLocked
                    ? t(
                        "bg-white/10 text-text-dark shadow-sm",
                        "bg-white text-text-light shadow-sm",
                      )
                    : t(
                        "text-text-dark/40 hover:text-text-dark/80",
                        "text-text-light/40 hover:text-text-light/80",
                      )
                }`}
              >
                <EyeIcon size={10} />
                <span>view</span>
              </button>
            </div>
          )}
          <MergedConnectionStatus collabStatus={collabStatus} t={t} />
          <ActiveCollaboratorsStack collaborators={mergedCollaborators} t={t} />
          {editable && isLoggedIn && <SharePopover pageId={pageId} />}
          {isLoggedIn && (
            <button
              aria-label={isFaved ? "Unfavorite page" : "Favorite page"}
              aria-pressed={isFaved}
              className={`p-0.5 transition-colors ${isFaved ? "text-yellow-400" : t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
              onClick={() => toggleFav.mutate(pageId)}
              type="button"
            >
              <BookmarkSimpleIcon size={14} weight={isFaved ? "fill" : "regular"} />
            </button>
          )}
          <button
            aria-label="Comments"
            className={`p-0.5 transition-colors ${commentsOpen ? t("text-text-dark", "text-text-light") : t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
            onClick={() => setCommentsOpen((prev) => !prev)}
            type="button"
          >
            <ChatCircleDotsIcon size={14} />
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
          {!isStandaloneShare && (
            <EditorMoreMenu
              pageId={pageId}
              title={localTitle}
              spaceName={spaceName}
              spaceSlug={spaceSlug}
              creatorId={creatorId}
              createdAt={createdAt}
              updatedAt={updatedAt}
              textContent={textContent}
              editor={editor}
              isFaved={isFaved}
              onToggleFav={() => toggleFav.mutate(pageId)}
              favPending={toggleFav.isPending}
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
              onOpenHistory={() => setHistoryOpen(true)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        <div
          ref={contentRef}
          className={`w-full blog-reader-prose flex-1 min-h-0 overflow-y-auto pb-32 ${fullWidth ? "px-8 md:px-16 lg:px-24" : "px-4 mx-auto max-w-2xl"}`}
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
            className={`w-full resize-none overflow-hidden bg-transparent !text-5xl !font-black border-none outline-none focus:outline-none focus:border-none focus:ring-0 pt-8 pb-0 px-0 mb-0.5 font-sans tracking-tight leading-tight ${t("text-neutral-200 placeholder-neutral-700", "text-neutral-800 placeholder-neutral-300")}`}
            placeholder="Untitled"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            disabled={!effectiveEditable}
          />
          <CreatorByline creator={creator} t={t} />
          <EditorContent editor={editor} />
          {editor && effectiveEditable && (
            <>
              <BubbleMenu editor={editor} onAddComment={handleOpenInlineComment} />
              <TableMenu editor={editor} />
              <ColumnsMenu editor={editor} />
              <CalloutMenu editor={editor} />
              <ImageMenu editor={editor} />
              <VideoMenu editor={editor} />
              <AudioMenu editor={editor} />
              <PdfMenu editor={editor} />
              <YoutubeMenu editor={editor} />
              <TableHandlesLayer editor={editor} />
            </>
          )}
        </div>

        <CommentSidebar
          isDarkMode={isDarkMode}
          isOpen={commentsOpen}
          isPageOwner={Boolean(currentUser && creatorId && currentUser.id === creatorId)}
          onClose={() => setCommentsOpen(false)}
          pageId={pageId}
        />
      </div>

      {inlineCommentState && (
        <div className="fixed bottom-6 right-6 z-50">
          <CommentDialog
            editor={editor}
            isDarkMode={isDarkMode}
            onClose={() => setInlineCommentState(null)}
            onSuccess={() => setCommentsOpen(true)}
            pageId={pageId}
            selectedText={inlineCommentState.selectedText}
          />
        </div>
      )}

      <PageDetailsPanel
        pageId={pageId}
        creator={creator}
        spaceName={spaceName}
        createdAt={createdAt}
        updatedAt={updatedAt}
        wordCount={derivedWordCount}
        characterCount={derivedCharCount}
        readingTime={derivedReadingTime}
        isLoggedIn={isLoggedIn}
        t={t}
        onClose={() => setDetailsOpen(false)}
        isOpen={detailsOpen}
      />

      {isLoggedIn && (
        <PageHistoryModal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          pageId={pageId}
          onRestoreSuccess={resetDirty}
        />
      )}

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
