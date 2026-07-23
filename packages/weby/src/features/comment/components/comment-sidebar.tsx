import {
  ChatCircleDotsIcon,
  CheckCircleIcon,
  PaperPlaneRightIcon,
  XIcon,
} from "@phosphor-icons/react";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { getGuestPokemon } from "#/features/editor/lib/pokemon-avatars";
import type { CommentItem } from "#/shared/types";
import { useCommentStream } from "../hooks/use-comment-stream";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useResolveComment,
  useUpdateComment,
} from "../hooks/use-comments";
import { CommentThread } from "./comment-thread";

interface CommentSidebarProps {
  pageId: string;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose?: () => void;
  userRole?: string;
  isPageOwner?: boolean;
}

export const CommentSidebar = ({
  pageId,
  isDarkMode,
  isOpen,
  onClose,
  userRole,
  isPageOwner,
}: CommentSidebarProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);

  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enable real-time SSE updates for page comments
  useCommentStream(pageId, isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      if (panelRef.current) {
        gsap.killTweensOf(panelRef.current);
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, width: 0, x: 20 },
          { duration: 0.25, ease: "power2.out", opacity: 1, width: "20rem", x: 0 },
        );
      }
    } else if (shouldRender && panelRef.current) {
      gsap.killTweensOf(panelRef.current);
      gsap.to(panelRef.current, {
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setShouldRender(false);
        },
        opacity: 0,
        width: 0,
        x: 20,
      });
    }
  }, [isOpen, shouldRender]);

  const { data: comments = [], isLoading } = useComments(pageId, { enabled: shouldRender });
  const createMutation = useCreateComment(pageId);
  const updateMutation = useUpdateComment(pageId);
  const deleteMutation = useDeleteComment(pageId);
  const resolveMutation = useResolveComment(pageId);

  // Group root comments and child replies
  const { openThreads, resolvedThreads, repliesByParent } = useMemo(() => {
    const repliesMap: Record<string, CommentItem[]> = {};
    const rootComments: CommentItem[] = [];

    for (const comment of comments) {
      if (comment.parentCommentId) {
        if (!repliesMap[comment.parentCommentId]) {
          repliesMap[comment.parentCommentId] = [];
        }
        repliesMap[comment.parentCommentId].push(comment);
      } else {
        rootComments.push(comment);
      }
    }

    const open = rootComments.filter((c) => !c.resolvedAt);
    const resolved = rootComments.filter((c) => Boolean(c.resolvedAt));

    return {
      openThreads: open,
      repliesByParent: repliesMap,
      resolvedThreads: resolved,
    };
  }, [comments]);

  const handleCreatePageComment = async () => {
    if (!newCommentText.trim() || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      const guest = user ? null : getGuestPokemon();
      await createMutation.mutateAsync({
        content: newCommentText,
        guestAvatar: guest?.avatar,
        guestName: guest ? `${guest.name} (Guest)` : undefined,
        type: "page",
      });
      setNewCommentText("");
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string, content: string) => {
    const guest = user ? null : getGuestPokemon();
    await createMutation.mutateAsync({
      content,
      guestAvatar: guest?.avatar,
      guestName: guest ? `${guest.name} (Guest)` : undefined,
      parentCommentId,
      type: "page",
    });
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    await updateMutation.mutateAsync({ commentId, input: { content } });
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteMutation.mutateAsync(commentId);
  };

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    await resolveMutation.mutateAsync({ commentId, input: { resolved } });
  };

  if (!shouldRender) {
    return null;
  }

  const activeThreads = tab === "open" ? openThreads : resolvedThreads;

  const renderContent = () => {
    if (isLoading) {
      return (
        <p className={`text-center text-xs py-4 ${t("text-text-dark/40", "text-text-light/40")}`}>
          loading comments...
        </p>
      );
    }
    if (activeThreads.length === 0) {
      return (
        <div
          className={`flex flex-col items-center justify-center py-8 text-center text-xs ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          <ChatCircleDotsIcon className="mb-1.5 opacity-40" size={24} />
          <p>{tab === "open" ? "no open comments" : "no resolved comments"}</p>
        </div>
      );
    }
    return activeThreads.map((thread) => (
      <CommentThread
        isDarkMode={isDarkMode}
        isPageOwner={isPageOwner}
        key={thread.id}
        onAddReply={handleAddReply}
        onDeleteComment={handleDeleteComment}
        onResolveComment={handleResolveComment}
        onUpdateComment={handleUpdateComment}
        pageId={pageId}
        replies={repliesByParent[thread.id] || []}
        rootComment={thread}
        userRole={userRole}
      />
    ));
  };

  const guest = user ? null : getGuestPokemon();
  const avatarUrl = user?.avatar_url || guest?.avatar;
  const displayName = user?.name || (guest ? `${guest.name} (Guest)` : "?");

  return (
    <div
      ref={panelRef}
      className={`flex h-full shrink-0 flex-col overflow-hidden border-l lowercase ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
      style={{ width: "20rem" }}
    >
      {/* Compact Top Header: Tabs with icons & reduced height */}
      <div
        className={`flex h-8 shrink-0 items-center justify-between border-b px-1.5 text-xs ${t("border-border-dark", "border-border-light")}`}
      >
        <div className="flex items-center gap-0.5 h-full">
          <button
            className={`flex h-full items-center gap-1.5 px-2.5 font-medium text-[11px] border-b-2 transition-colors ${
              tab === "open"
                ? "border-purple-500 text-purple-500 dark:text-purple-400"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            onClick={() => setTab("open")}
            type="button"
          >
            <ChatCircleDotsIcon size={13} />
            <span>open ({openThreads.length})</span>
          </button>
          <button
            className={`flex h-full items-center gap-1.5 px-2.5 font-medium text-[11px] border-b-2 transition-colors ${
              tab === "resolved"
                ? "border-green-500 text-green-500"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            onClick={() => setTab("resolved")}
            type="button"
          >
            <CheckCircleIcon size={13} />
            <span>resolved ({resolvedThreads.length})</span>
          </button>
        </div>

        {onClose && (
          <button
            className={`p-1 opacity-50 hover:opacity-100 transition-opacity ${t("text-text-dark", "text-text-light")}`}
            onClick={onClose}
            title="Close comments"
            type="button"
          >
            <XIcon size={13} />
          </button>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{renderContent()}</div>

      {/* Page level comment input box at bottom */}
      <div
        className={`border-t p-2 ${t("border-border-dark bg-black/10", "border-border-light bg-black/5")}`}
      >
        <div className="flex items-start gap-1.5">
          {avatarUrl ? (
            <img
              alt={displayName}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-none object-cover border border-border-dark/40"
              src={avatarUrl}
            />
          ) : (
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[9px] font-semibold uppercase ${t("border-border-dark bg-white/10 text-text-dark", "border-border-light bg-black/5 text-text-light")}`}
            >
              {displayName.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <textarea
              className={`w-full border p-1 text-[11px] placeholder:text-[10px] placeholder:opacity-50 outline-none focus:ring-1 focus:ring-purple-500/50 ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleCreatePageComment();
                }
              }}
              placeholder={
                guest
                  ? `add a comment as ${guest.name.toLowerCase()} (Ctrl+Enter)...`
                  : "add a comment (Ctrl+Enter to send)..."
              }
              rows={2}
              value={newCommentText}
            />
            <div className="mt-1 flex items-center justify-end">
              <button
                className="flex items-center gap-1 border border-purple-600/60 bg-purple-600/20 px-2 py-0.5 text-[10px] lowercase text-purple-400 hover:bg-purple-600/30 dark:text-purple-300 disabled:opacity-50 transition-colors"
                disabled={isSubmitting || !newCommentText.trim()}
                onClick={() => void handleCreatePageComment()}
                type="button"
              >
                <PaperPlaneRightIcon size={11} />
                comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
