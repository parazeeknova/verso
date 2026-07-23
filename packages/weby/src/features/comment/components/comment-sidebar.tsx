import { ChatCircleDotsIcon, PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useAuth } from "#/features/auth/hooks/use-auth";
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
  onClose?: () => void;
  userRole?: string;
}

export const CommentSidebar = ({ pageId, isDarkMode, onClose, userRole }: CommentSidebarProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: user } = useAuth();

  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enable real-time SSE updates for page comments
  useCommentStream(pageId);

  const { data: comments = [], isLoading } = useComments(pageId);
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
      await createMutation.mutateAsync({
        content: newCommentText,
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
    await createMutation.mutateAsync({
      content,
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

  return (
    <div
      className={`flex h-full w-80 shrink-0 flex-col border-l lowercase ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${t("border-border-dark", "border-border-light")}`}
      >
        <div className="flex items-center gap-1.5 font-medium text-xs">
          <ChatCircleDotsIcon size={14} />
          <span>comments</span>
        </div>
        {onClose && (
          <button
            className={`p-0.5 opacity-60 hover:opacity-100 ${t("text-text-dark", "text-text-light")}`}
            onClick={onClose}
            type="button"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b text-xs ${t("border-border-dark", "border-border-light")}`}>
        <button
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors ${
            tab === "open"
              ? "border-blue-500 text-blue-500"
              : `border-transparent opacity-50 hover:opacity-80`
          }`}
          onClick={() => setTab("open")}
          type="button"
        >
          open ({openThreads.length})
        </button>
        <button
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors ${
            tab === "resolved"
              ? "border-green-500 text-green-500"
              : `border-transparent opacity-50 hover:opacity-80`
          }`}
          onClick={() => setTab("resolved")}
          type="button"
        >
          resolved ({resolvedThreads.length})
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{renderContent()}</div>

      {/* Page level comment input box at bottom */}
      <div
        className={`border-t p-2 ${t("border-border-dark bg-black/10", "border-border-light bg-black/5")}`}
      >
        <div className="flex items-start gap-1.5">
          {user?.avatar_url ? (
            <img
              alt={user.name}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-none object-cover border border-border-dark/40"
              src={user.avatar_url}
            />
          ) : (
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[9px] font-semibold uppercase ${t("border-border-dark bg-white/10 text-text-dark", "border-border-light bg-black/5 text-text-light")}`}
            >
              {(user?.name || "?").slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <textarea
              className={`w-full border p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/50 ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleCreatePageComment();
                }
              }}
              placeholder="add a comment (Ctrl+Enter to send)..."
              rows={2}
              value={newCommentText}
            />
            <div className="mt-1 flex items-center justify-end">
              <button
                className="flex items-center gap-1 border border-blue-600 bg-blue-600/20 px-2 py-0.5 text-[10px] lowercase text-blue-400 hover:bg-blue-600/30 disabled:opacity-50"
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
