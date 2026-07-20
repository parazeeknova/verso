import {
  ArrowClockwiseIcon,
  ClockCounterClockwiseIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  useDeleteAllPageHistory,
  useDeleteHistoryEntry,
  usePageHistory,
  useRestorePage,
} from "#/features/console/hooks/use-pages";
import { useUserById } from "#/features/console/hooks/use-users";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { markdownToHtml } from "#/features/blog/lib/markdown-to-html";
import { tiptapToMarkdown } from "#/features/editor/lib/tiptap-to-markdown";
import type { JSONContent } from "@tiptap/core";
import type { PageHistoryItem } from "#/shared/types";

interface PageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  onRestoreSuccess?: () => void;
}

const formatHistoryDate = (iso: string) => {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "short",
  });
};

const parseJsonContent = (raw?: string): JSONContent | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed as JSONContent;
    }
  } catch {
    /* fallback */
  }
  return null;
};

const getOpTagStyle = (op: string) => {
  if (op === "create") {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (op === "restore") {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
};

const HistoryAuthor = ({
  createdById,
  t,
}: {
  createdById: string;
  t: (dark: string, light: string) => string;
}) => {
  const { data: user } = useUserById(createdById);
  const displayName = user?.name || user?.username || "author";

  return (
    <div className="flex items-center gap-1 min-w-0">
      <AvatarBadge
        icon={user?.avatar_url}
        name={displayName}
        className="w-3 h-3 shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center rounded-full"
        initialsClass="text-[6px] text-neutral-600 dark:text-neutral-300 font-semibold"
      />
      <span className={`text-[9px] truncate ${t("text-text-dark/50", "text-text-light/50")}`}>
        {displayName}
      </span>
    </div>
  );
};

const HistoryItemRow = ({
  item,
  isSelected,
  onSelect,
  onDelete,
  t,
}: {
  item: PageHistoryItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  t: (dark: string, light: string) => string;
}) => {
  const activeClass = isSelected
    ? t(
        "bg-white/10 border-l-2 border-accent text-text-dark",
        "bg-black/5 border-l-2 border-accent text-text-light",
      )
    : t(
        "hover:bg-white/5 text-text-dark/70 border-l-2 border-transparent",
        "hover:bg-black/3 text-text-light/70 border-l-2 border-transparent",
      );

  const opTagBg = getOpTagStyle(item.operation);

  return (
    <div
      className={`group relative w-full text-left p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${activeClass}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9.5px] font-semibold truncate flex-1">
          {item.title || "untitled"}
        </span>
        <span
          className={`text-[7.5px] font-mono uppercase px-1 py-0.2 border rounded-none shrink-0 ${opTagBg}`}
        >
          {item.operation}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition-opacity"
          aria-label="delete revision"
        >
          <TrashIcon size={10} />
        </button>
      </div>
      <div className="flex items-center justify-between text-[8.5px] gap-2">
        <HistoryAuthor createdById={item.createdById} t={t} />
        <span
          className={`font-mono text-[8px] shrink-0 ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          {formatHistoryDate(item.createdAt)}
        </span>
      </div>
    </div>
  );
};

export const PageHistoryModal = ({
  isOpen,
  onClose,
  pageId,
  onRestoreSuccess,
}: PageHistoryModalProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: history = [], isPending } = usePageHistory(pageId);
  const restorePage = useRestorePage();
  const deleteEntry = useDeleteHistoryEntry();
  const deleteAllHistory = useDeleteAllPageHistory();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (history.length > 0 && !selectedId) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  useEffect(() => {
    gsap.set(backdropRef.current, { opacity: 0 });
    gsap.set(modalRef.current, { opacity: 0, scale: 0.95, y: 10 });
    gsap.set(containerRef.current, { display: "none" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.set(containerRef.current, { display: "flex" });
      gsap.to(backdropRef.current, {
        duration: 0.2,
        ease: "power2.out",
        opacity: 1,
      });
      gsap.to(modalRef.current, {
        duration: 0.25,
        ease: "power2.out",
        opacity: 1,
        scale: 1,
        y: 0,
      });
    } else {
      gsap.to(backdropRef.current, {
        duration: 0.15,
        ease: "power2.in",
        opacity: 0,
      });
      gsap.to(modalRef.current, {
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(containerRef.current, { display: "none" });
        },
        opacity: 0,
        scale: 0.95,
        y: 10,
      });
    }
  }, [isOpen]);

  const selectedItem = useMemo(() => {
    if (!selectedId) {
      return history[0] ?? null;
    }
    return history.find((h) => h.id === selectedId) ?? history[0] ?? null;
  }, [history, selectedId]);

  const previewHtml = useMemo(() => {
    if (!selectedItem) {
      return "";
    }
    const json = parseJsonContent(selectedItem.contentJson);
    if (json) {
      const markdown = tiptapToMarkdown(json, selectedItem.title);
      return markdownToHtml(markdown);
    }
    if (selectedItem.textContent) {
      return markdownToHtml(`# ${selectedItem.title}\n\n${selectedItem.textContent}`);
    }
    return markdownToHtml(`# ${selectedItem.title}`);
  }, [selectedItem]);

  const handleRestore = () => {
    if (!selectedItem) {
      return;
    }
    restorePage.mutate(
      { id: pageId, input: { historyId: selectedItem.id } },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setFlashToast(`failed to restore: ${msg}`);
        },
        onSuccess: () => {
          setFlashToast(
            `restored page to version from ${formatHistoryDate(selectedItem.createdAt)}`,
          );
          onRestoreSuccess?.();
          onClose();
        },
      },
    );
  };

  const handleDeleteEntry = (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation();
    deleteEntry.mutate(
      { historyId, pageId },
      {
        onSuccess: () => {
          setFlashToast("deleted history revision");
          if (selectedId === historyId) {
            setSelectedId(null);
          }
        },
      },
    );
  };

  const handleClearAllHistory = () => {
    if (history.length === 0) {
      return;
    }
    deleteAllHistory.mutate(pageId, {
      onSuccess: () => {
        setFlashToast("cleared all page history");
        setSelectedId(null);
      },
    });
  };

  const renderHistoryList = () => {
    if (isPending) {
      return <div className="p-3 text-[9px] lowercase opacity-40">loading history...</div>;
    }
    if (history.length === 0) {
      return <div className="p-3 text-[9px] lowercase opacity-40">no revisions found</div>;
    }
    return history.map((item) => (
      <HistoryItemRow
        key={item.id}
        item={item}
        isSelected={selectedItem?.id === item.id}
        onSelect={() => setSelectedId(item.id)}
        onDelete={(e) => handleDeleteEntry(e, item.id)}
        t={t}
      />
    ));
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-9999 items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer border-none"
        onClick={onClose}
        aria-label="Close history modal backdrop"
      />

      <div
        ref={modalRef}
        className={`relative z-10 w-full max-w-2xl h-[500px] border flex flex-col shadow-2xl overflow-hidden ${t(
          "bg-bg-dark border-border-dark text-text-dark",
          "bg-bg-light border-border-light text-text-light",
        )}`}
      >
        {/* Compact Header */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${t(
            "border-border-dark bg-black/20",
            "border-border-light bg-black/3",
          )}`}
        >
          <div className="flex items-center gap-1.5">
            <ClockCounterClockwiseIcon className="text-accent" size={14} />
            <span className="font-semibold text-[11px] lowercase tracking-tight">page history</span>
            <span
              className={`text-[9px] font-mono ${t("text-text-dark/40", "text-text-light/40")}`}
            >
              ({history.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-0.5 transition-colors cursor-pointer ${t(
              "text-text-dark/40 hover:text-text-dark",
              "text-text-light/40 hover:text-text-light",
            )}`}
            aria-label="Close history modal"
          >
            <XIcon size={13} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Compact Revisions List Sidebar */}
          <div
            className={`w-52 shrink-0 border-r flex flex-col overflow-hidden ${t(
              "border-border-dark bg-black/10",
              "border-border-light bg-white/40",
            )}`}
          >
            <div className="px-2 py-1 border-b flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-40">
                revisions
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  disabled={deleteAllHistory.isPending}
                  className="p-0.5 text-red-400/60 hover:text-red-400 text-[9px] transition-colors cursor-pointer flex items-center gap-0.5"
                  title="clear all history"
                >
                  <TrashIcon size={10} />
                  <span>clear all</span>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/10 dark:divide-neutral-100/10">
              {renderHistoryList()}
            </div>
          </div>

          {/* Compact Preview & Restore Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-transparent">
            {selectedItem ? (
              <>
                {/* Action Bar */}
                <div
                  className={`flex items-center justify-between px-3 py-1.5 border-b shrink-0 ${t(
                    "border-border-dark bg-white/2",
                    "border-border-light bg-black/2",
                  )}`}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-semibold text-[11px] truncate lowercase">
                      {selectedItem.title}
                    </div>
                    <div
                      className={`text-[8.5px] font-mono ${t("text-text-dark/40", "text-text-light/40")}`}
                    >
                      {formatHistoryDate(selectedItem.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEntry(e, selectedItem.id)}
                      disabled={deleteEntry.isPending}
                      className="p-1 text-red-400/70 hover:text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors cursor-pointer"
                      title="delete this revision"
                    >
                      <TrashIcon size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={handleRestore}
                      disabled={restorePage.isPending}
                      className={`flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-medium lowercase transition-colors cursor-pointer border ${t(
                        "border-accent bg-accent/10 text-accent hover:bg-accent/20",
                        "border-accent bg-accent/10 text-accent hover:bg-accent/20",
                      )}`}
                    >
                      <ArrowClockwiseIcon
                        size={11}
                        className={restorePage.isPending ? "animate-spin" : ""}
                      />
                      <span>{restorePage.isPending ? "restoring..." : "restore version"}</span>
                    </button>
                  </div>
                </div>

                {/* Document Preview Area */}
                <div className="flex-1 overflow-y-auto p-4 blog-reader-prose text-xs">
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <span className="text-[10px] lowercase opacity-40">
                  select a revision to preview
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
