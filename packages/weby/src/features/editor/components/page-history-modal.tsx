import { ArrowClockwiseIcon, ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { useTheme } from "#/shared/hooks/use-theme";
import { usePageHistory, useRestorePage } from "#/features/console/hooks/use-pages";
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
    year: "numeric",
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
        className="w-3.5 h-3.5 shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center rounded-full"
        initialsClass="text-[7px] text-neutral-600 dark:text-neutral-300 font-semibold"
      />
      <span className={`text-[9.5px] truncate ${t("text-text-dark/50", "text-text-light/50")}`}>
        {displayName}
      </span>
    </div>
  );
};

const HistoryItemRow = ({
  item,
  isSelected,
  onSelect,
  t,
}: {
  item: PageHistoryItem;
  isSelected: boolean;
  onSelect: () => void;
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
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-2.5 transition-colors cursor-pointer flex flex-col gap-1 ${activeClass}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold truncate flex-1">
          {item.title || "untitled"}
        </span>
        <span
          className={`text-[8px] font-mono uppercase px-1 py-0.2 border rounded-none shrink-0 ${opTagBg}`}
        >
          {item.operation}
        </span>
      </div>
      <div className="flex items-center justify-between text-[9px] gap-2">
        <HistoryAuthor createdById={item.createdById} t={t} />
        <span
          className={`font-mono text-[8.5px] shrink-0 ${t("text-text-dark/30", "text-text-light/30")}`}
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

  const renderHistoryList = () => {
    if (isPending) {
      return <div className="p-4 text-[10px] lowercase opacity-40">loading history...</div>;
    }
    if (history.length === 0) {
      return <div className="p-4 text-[10px] lowercase opacity-40">no revisions found</div>;
    }
    return history.map((item) => (
      <HistoryItemRow
        key={item.id}
        item={item}
        isSelected={selectedItem?.id === item.id}
        onSelect={() => setSelectedId(item.id)}
        t={t}
      />
    ));
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-9999 items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer border-none"
        onClick={onClose}
        aria-label="Close history modal backdrop"
      />

      <div
        ref={modalRef}
        className={`relative z-10 w-full max-w-4xl h-[85vh] border flex flex-col shadow-2xl overflow-hidden ${t(
          "bg-bg-dark border-border-dark text-text-dark",
          "bg-bg-light border-border-light text-text-light",
        )}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${t(
            "border-border-dark bg-black/20",
            "border-border-light bg-black/3",
          )}`}
        >
          <div className="flex items-center gap-2">
            <ClockCounterClockwiseIcon className="text-accent" size={16} />
            <span className="font-semibold text-xs lowercase tracking-tight">page history</span>
            <span
              className={`text-[10px] font-mono ${t("text-text-dark/40", "text-text-light/40")}`}
            >
              ({history.length} {history.length === 1 ? "revision" : "revisions"})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 transition-colors cursor-pointer ${t(
              "text-text-dark/40 hover:text-text-dark",
              "text-text-light/40 hover:text-text-light",
            )}`}
            aria-label="Close history modal"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Revisions List Sidebar */}
          <div
            className={`w-64 sm:w-72 shrink-0 border-r flex flex-col overflow-hidden ${t(
              "border-border-dark bg-black/10",
              "border-border-light bg-white/40",
            )}`}
          >
            <div className="p-2 border-b text-[10px] font-bold uppercase tracking-wider opacity-40">
              revisions
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/10 dark:divide-neutral-100/10">
              {renderHistoryList()}
            </div>
          </div>

          {/* Preview & Restore Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-transparent">
            {selectedItem ? (
              <>
                {/* Action Bar */}
                <div
                  className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${t(
                    "border-border-dark bg-white/2",
                    "border-border-light bg-black/2",
                  )}`}
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="font-semibold text-xs truncate lowercase">
                      {selectedItem.title}
                    </div>
                    <div
                      className={`text-[9.5px] font-mono ${t("text-text-dark/40", "text-text-light/40")}`}
                    >
                      {formatHistoryDate(selectedItem.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={restorePage.isPending}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium lowercase transition-colors cursor-pointer border ${t(
                      "border-accent bg-accent/10 text-accent hover:bg-accent/20",
                      "border-accent bg-accent/10 text-accent hover:bg-accent/20",
                    )}`}
                  >
                    <ArrowClockwiseIcon
                      size={12}
                      className={restorePage.isPending ? "animate-spin" : ""}
                    />
                    <span>{restorePage.isPending ? "restoring..." : "restore version"}</span>
                  </button>
                </div>

                {/* Document Preview Area */}
                <div className="flex-1 overflow-y-auto p-6 blog-reader-prose">
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <span className="text-[11px] lowercase opacity-40">
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
