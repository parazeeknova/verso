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
    // fallback
  }
  return null;
};

const opLabel = (op: string) => {
  if (op === "create") {
    return "c";
  }
  if (op === "restore") {
    return "r";
  }
  return "u";
};

const opColor = (op: string, isDark: boolean) => {
  if (op === "create") {
    return isDark ? "text-accent" : "text-accent";
  }
  if (op === "restore") {
    return isDark ? "text-purple-400" : "text-purple-600";
  }
  return isDark ? "text-text-dark/30" : "text-text-light/30";
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
        className={`w-3 h-3 shrink-0 flex items-center justify-center ${t("bg-white/10", "bg-black/10")}`}
        initialsClass={`text-[6px] font-semibold ${t("text-text-dark/50", "text-text-light/50")}`}
      />
      <span className={`text-[9px] truncate ${t("text-text-dark/40", "text-text-light/40")}`}>
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
  isDarkMode,
}: {
  item: PageHistoryItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  t: (dark: string, light: string) => string;
  isDarkMode: boolean;
}) => {
  const activeClass = isSelected
    ? t("bg-accent/8 border-l-2 border-l-accent", "bg-accent/8 border-l-2 border-l-accent")
    : t(
        "hover:bg-white/4 border-l-2 border-l-transparent",
        "hover:bg-black/4 border-l-2 border-l-transparent",
      );

  return (
    <button
      type="button"
      className={`group w-full text-left px-2 py-1.5 transition-colors cursor-pointer flex flex-col gap-0.5 ${activeClass}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-1">
        <span
          className={`text-[8px] font-mono uppercase leading-none ${opColor(item.operation, isDarkMode)}`}
          title={item.operation}
        >
          {opLabel(item.operation)}
        </span>
        <span
          className={`text-[10px] font-semibold truncate flex-1 ${isSelected ? t("text-text-dark", "text-text-light") : t("text-text-dark/60", "text-text-light/60")}`}
        >
          {item.title || "untitled"}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400/50 hover:text-red-400 transition-opacity cursor-pointer"
        >
          <TrashIcon size={9} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-1">
        <HistoryAuthor createdById={item.createdById} t={t} />
        <span
          className={`font-mono text-[8px] shrink-0 ${t("text-text-dark/20", "text-text-light/20")}`}
        >
          {formatHistoryDate(item.createdAt)}
        </span>
      </div>
    </button>
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
    gsap.set(modalRef.current, { opacity: 0, scale: 0.97, y: 8 });
    gsap.set(containerRef.current, { display: "none" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.set(containerRef.current, { display: "flex" });
      gsap.to(backdropRef.current, {
        duration: 0.18,
        ease: "power2.out",
        opacity: 1,
      });
      gsap.to(modalRef.current, {
        duration: 0.22,
        ease: "power2.out",
        opacity: 1,
        scale: 1,
        y: 0,
      });
    } else {
      gsap.to(backdropRef.current, {
        duration: 0.12,
        ease: "power2.in",
        opacity: 0,
      });
      gsap.to(modalRef.current, {
        duration: 0.12,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(containerRef.current, { display: "none" });
        },
        opacity: 0,
        scale: 0.97,
        y: 8,
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
          setFlashToast(`restored to ${formatHistoryDate(selectedItem.createdAt)}`);
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
          setFlashToast("revision deleted");
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
        setFlashToast("history cleared");
        setSelectedId(null);
      },
    });
  };

  const renderHistoryList = () => {
    if (isPending) {
      return (
        <div className={`p-3 text-[9px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
          loading...
        </div>
      );
    }
    if (history.length === 0) {
      return (
        <div className={`p-3 text-[9px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
          no revisions
        </div>
      );
    }
    return history.map((item) => (
      <HistoryItemRow
        key={item.id}
        item={item}
        isSelected={selectedItem?.id === item.id}
        onSelect={() => setSelectedId(item.id)}
        onDelete={(e) => handleDeleteEntry(e, item.id)}
        t={t}
        isDarkMode={isDarkMode}
      />
    ));
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-9999 items-center justify-center p-4">
      <button
        type="button"
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer border-none"
        onClick={onClose}
        aria-label="Close history modal backdrop"
      />

      <div
        ref={modalRef}
        className={`relative z-10 w-full max-w-2xl h-[460px] border flex flex-col overflow-hidden ${t(
          "bg-bg-dark border-border-dark text-text-dark",
          "bg-bg-light border-border-light text-text-light",
        )}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 border-b shrink-0 ${t(
            "border-border-dark",
            "border-border-light",
          )}`}
        >
          <div className="flex items-center gap-1.5">
            <ClockCounterClockwiseIcon className="text-accent" size={12} />
            <span className="font-semibold text-[11px] lowercase">history</span>
            <span
              className={`text-[9px] font-mono ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              {history.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-0.5 transition-colors cursor-pointer ${t(
              "text-text-dark/30 hover:text-text-dark",
              "text-text-light/30 hover:text-text-light",
            )}`}
            aria-label="Close history modal"
          >
            <XIcon size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Revisions sidebar */}
          <div
            className={`w-48 shrink-0 border-r flex flex-col overflow-hidden ${t(
              "border-border-dark bg-white/2",
              "border-border-light bg-black/2",
            )}`}
          >
            {/* Sidebar header */}
            <div
              className={`px-2 py-1 border-b flex items-center justify-between ${t(
                "border-border-dark",
                "border-border-light",
              )}`}
            >
              <span
                className={`text-[8px] font-mono uppercase tracking-wider ${t("text-text-dark/25", "text-text-light/25")}`}
              >
                revisions
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  disabled={deleteAllHistory.isPending}
                  className="text-red-400/40 hover:text-red-400 text-[8px] transition-colors cursor-pointer flex items-center gap-0.5 lowercase"
                  title="clear all"
                >
                  <TrashIcon size={8} />
                  <span>clear</span>
                </button>
              )}
            </div>

            {/* Revisions list */}
            <div
              className={`flex-1 overflow-y-auto divide-y ${t(
                "divide-border-dark",
                "divide-border-light",
              )}`}
            >
              {renderHistoryList()}
            </div>
          </div>

          {/* Preview panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedItem ? (
              <>
                {/* Preview header — title + date + delete */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 border-b shrink-0 ${t(
                    "border-border-dark",
                    "border-border-light",
                  )}`}
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div
                      className={`font-semibold text-[10px] truncate lowercase ${t("text-text-dark/80", "text-text-light/80")}`}
                    >
                      {selectedItem.title}
                    </div>
                    <div
                      className={`text-[8px] font-mono ${t("text-text-dark/25", "text-text-light/25")}`}
                    >
                      {formatHistoryDate(selectedItem.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteEntry(e, selectedItem.id)}
                    disabled={deleteEntry.isPending}
                    className={`p-1 transition-colors cursor-pointer border ${t(
                      "text-red-400/50 hover:text-red-400 border-border-dark hover:bg-red-400/10",
                      "text-red-400/50 hover:text-red-400 border-border-light hover:bg-red-400/10",
                    )}`}
                    title="delete revision"
                  >
                    <TrashIcon size={10} />
                  </button>
                </div>

                {/* Preview content */}
                <div className="flex-1 overflow-y-auto p-3 blog-reader-prose text-xs">
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>

                {/* Restore footer */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 border-t shrink-0 ${t(
                    "border-border-dark",
                    "border-border-light",
                  )}`}
                >
                  <span
                    className={`text-[8px] font-mono lowercase ${t("text-text-dark/20", "text-text-light/20")}`}
                  >
                    {selectedItem.operation} · {formatHistoryDate(selectedItem.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={restorePage.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium lowercase transition-colors cursor-pointer border border-accent text-accent hover:bg-accent hover:text-white"
                  >
                    <ArrowClockwiseIcon
                      size={10}
                      className={restorePage.isPending ? "animate-spin" : ""}
                    />
                    <span>{restorePage.isPending ? "restoring..." : "restore this version"}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span
                  className={`text-[10px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}
                >
                  select a revision
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
