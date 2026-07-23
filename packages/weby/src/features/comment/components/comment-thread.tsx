import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { CommentItem as CommentItemType } from "#/shared/types";
import { CommentItem } from "./comment-item";

interface CommentThreadProps {
  rootComment: CommentItemType;
  replies: CommentItemType[];
  pageId: string;
  isDarkMode: boolean;
  onAddReply: (parentCommentId: string, content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onResolveComment: (commentId: string, resolved: boolean) => Promise<void>;
  userRole?: string;
  isPageOwner?: boolean;
  canComment?: boolean;
}

export const CommentThread = ({
  rootComment,
  replies,
  pageId,
  isDarkMode,
  onAddReply,
  onUpdateComment,
  onDeleteComment,
  onResolveComment,
  userRole,
  isPageOwner,
  canComment = true,
}: CommentThreadProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim() || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      await onAddReply(rootComment.id, replyText);
      setReplyText("");
      setIsReplying(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResolved = rootComment.resolvedAt !== null && rootComment.resolvedAt !== undefined;

  return (
    <div
      className={`border space-y-1.5 p-1.5 transition-all ${
        isResolved ? "opacity-60 hover:opacity-100" : ""
      } ${t("border-border-dark/80 bg-bg-dark/20", "border-border-light/80 bg-bg-light/20")}`}
    >
      {/* Root parent comment */}
      <CommentItem
        comment={rootComment}
        frameless
        isDarkMode={isDarkMode}
        isPageOwner={isPageOwner}
        isThreadResolved={isResolved}
        onDelete={onDeleteComment}
        onReply={canComment ? () => setIsReplying(true) : undefined}
        onResolve={onResolveComment}
        onUpdate={onUpdateComment}
        pageId={pageId}
        userRole={userRole}
      />

      {/* Nested Replies */}
      {replies.length > 0 && (
        <div className="ml-3 border-l-2 space-y-2 pt-1 pl-2 border-border-dark/40">
          {replies.map((reply) => (
            <CommentItem
              comment={reply}
              frameless
              isDarkMode={isDarkMode}
              isThreadResolved={isResolved}
              key={reply.id}
              onDelete={onDeleteComment}
              onUpdate={onUpdateComment}
              pageId={pageId}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Inline reply form */}
      {isReplying && !isResolved && (
        <div className="ml-3 border p-1.5 mt-1 border-border-dark/60 bg-black/10">
          <textarea
            autoFocus
            className={`w-full border p-1 text-[11px] placeholder:text-[10px] placeholder:opacity-50 outline-none focus:ring-1 focus:ring-purple-500/50 ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSendReply();
              }
            }}
            placeholder="reply to thread (Ctrl+Enter to send)..."
            rows={2}
            value={replyText}
          />
          <div className="mt-1 flex items-center justify-end gap-1">
            <button
              className={`border px-2 py-0.5 text-[10px] lowercase ${t("border-border-dark text-text-dark/50 hover:text-text-dark", "border-border-light text-text-light/50 hover:text-text-light")}`}
              onClick={() => setIsReplying(false)}
              type="button"
            >
              cancel
            </button>
            <button
              className="flex items-center gap-1 border border-purple-600/60 bg-purple-600/20 px-2 py-0.5 text-[10px] lowercase text-purple-400 hover:bg-purple-600/30 dark:text-purple-300 disabled:opacity-50 transition-colors"
              disabled={isSubmitting || !replyText.trim()}
              onClick={() => void handleSendReply()}
              type="button"
            >
              <PaperPlaneRightIcon size={10} />
              reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
