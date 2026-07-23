import {
  CheckIcon,
  ArrowUUpLeftIcon,
  DotsThreeIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useAuth } from "#/features/auth/hooks/use-auth";
import type { CommentItem as CommentItemType } from "#/shared/types";

interface CommentItemProps {
  comment: CommentItemType;
  pageId: string;
  isDarkMode: boolean;
  onReply?: (parentCommentId: string) => void;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>;
  userRole?: string;
  frameless?: boolean;
  isPageOwner?: boolean;
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
};

const CommentHeader = ({
  comment,
  t,
}: {
  comment: CommentItemType;
  t: (dark: string, light: string) => string;
}) => (
  <div className="flex items-center gap-1.5 min-w-0">
    {comment.creator.avatarUrl ? (
      <img
        alt={comment.creator.name}
        className="h-4 w-4 shrink-0 rounded-none object-cover border border-border-dark/40"
        src={comment.creator.avatarUrl}
      />
    ) : (
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-semibold uppercase border ${t("border-border-dark bg-white/10 text-text-dark", "border-border-light bg-black/5 text-text-light")}`}
      >
        {(comment.creator.name || "?").slice(0, 2)}
      </span>
    )}
    <span
      className={`truncate font-medium lowercase ${t("text-text-dark/90", "text-text-light/90")}`}
    >
      {comment.creator.name}
    </span>
    <span className={`text-[10px] ${t("text-text-dark/40", "text-text-light/40")}`}>
      {formatTimeAgo(comment.createdAt)}
    </span>
    {comment.editedAt && (
      <span className={`text-[9px] italic ${t("text-text-dark/30", "text-text-light/30")}`}>
        (edited)
      </span>
    )}
  </div>
);

const CommentActions = ({
  isRootComment,
  isResolved,
  onResolve,
  commentId,
  onReply,
  isOwner,
  canDelete,
  isMenuOpen,
  setIsMenuOpen,
  setIsEditing,
  onDelete,
  isPageOwner,
  t,
}: {
  isRootComment: boolean;
  isResolved: boolean;
  onResolve?: (commentId: string, resolved: boolean) => Promise<void>;
  commentId: string;
  onReply?: (parentCommentId: string) => void;
  isOwner: boolean;
  canDelete: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (fn: (o: boolean) => boolean) => void;
  setIsEditing: (val: boolean) => void;
  onDelete: (commentId: string) => Promise<void>;
  isPageOwner?: boolean;
  t: (dark: string, light: string) => string;
}) => (
  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
    {isRootComment && onResolve && isPageOwner && (
      <button
        className={`flex h-5 w-5 items-center justify-center border p-0.5 lowercase transition-colors ${
          isResolved
            ? "border-green-600/50 bg-green-500/10 text-green-500 hover:bg-green-500/20"
            : t(
                "border-border-dark/60 text-text-dark/50 hover:border-border-dark hover:text-text-dark",
                "border-border-light/60 text-text-light/50 hover:border-border-light hover:text-text-light",
              )
        }`}
        onClick={() => void onResolve(commentId, !isResolved)}
        title={isResolved ? "Re-open comment" : "Resolve comment"}
        type="button"
      >
        <CheckIcon size={11} weight={isResolved ? "bold" : "regular"} />
      </button>
    )}

    {isRootComment && !isResolved && onReply && (
      <button
        className={`flex h-5 w-5 items-center justify-center border p-0.5 lowercase transition-colors ${t("border-border-dark/60 text-text-dark/50 hover:border-border-dark hover:text-text-dark", "border-border-light/60 text-text-light/50 hover:border-border-light hover:text-text-light")}`}
        onClick={() => onReply(commentId)}
        title="Reply to thread"
        type="button"
      >
        <ArrowUUpLeftIcon size={11} />
      </button>
    )}

    {(isOwner || canDelete) && (
      <div className="relative">
        <button
          className={`flex h-5 w-5 items-center justify-center border p-0.5 ${t("border-border-dark/60 text-text-dark/50 hover:text-text-dark", "border-border-light/60 text-text-light/50 hover:text-text-light")}`}
          onClick={() => setIsMenuOpen((o) => !o)}
          type="button"
        >
          <DotsThreeIcon size={13} weight="bold" />
        </button>

        {isMenuOpen && (
          <div
            className={`absolute right-0 top-full z-30 mt-1 min-w-24 border p-0.5 shadow-lg lowercase ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
          >
            {isOwner && (
              <button
                className={`flex w-full items-center gap-1.5 px-2 py-1 text-[11px] text-left hover:bg-black/5 ${t("text-text-dark/80 hover:bg-white/5", "text-text-light/80")}`}
                onClick={() => {
                  setIsEditing(true);
                  setIsMenuOpen(() => false);
                }}
                type="button"
              >
                <PencilIcon size={11} />
                edit
              </button>
            )}
            {canDelete && (
              <button
                className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] text-left text-red-500 hover:bg-red-500/10"
                onClick={() => {
                  setIsMenuOpen(() => false);
                  void onDelete(commentId);
                }}
                type="button"
              >
                <TrashIcon size={11} />
                delete
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);

export const CommentItem = ({
  comment,
  pageId: _pageId,
  isDarkMode,
  onReply,
  onUpdate,
  onDelete,
  onResolve,
  userRole,
  frameless = false,
  isPageOwner = false,
}: CommentItemProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: currentUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = currentUser?.id === comment.creatorId;
  const canDelete = isOwner || userRole === "admin" || userRole === "owner";
  const isResolved = comment.resolvedAt !== null && comment.resolvedAt !== undefined;
  const isRootComment =
    comment.parentCommentId === null ||
    comment.parentCommentId === undefined ||
    comment.parentCommentId === "";

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      await onUpdate(comment.id, editContent);
      setIsEditing(false);
    } catch {
      // Error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextClick = () => {
    if (!comment.id) {
      return;
    }
    const el = document.querySelector(`.comment-mark[data-comment-id="${comment.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-purple-500/50");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-purple-500/50");
      }, 2500);
    }
  };

  return (
    <div
      className={`group relative text-xs transition-colors ${
        frameless
          ? "p-0 bg-transparent"
          : `border p-2 ${t("border-border-dark/60 bg-bg-dark/40", "border-border-light/60 bg-bg-light/40")}`
      }`}
      data-comment-id={comment.id}
    >
      <div className="flex items-center justify-between gap-1.5 pb-1">
        <CommentHeader comment={comment} t={t} />
        <CommentActions
          canDelete={canDelete}
          commentId={comment.id}
          isMenuOpen={isMenuOpen}
          isOwner={isOwner}
          isPageOwner={isPageOwner}
          isResolved={isResolved}
          isRootComment={isRootComment}
          onDelete={onDelete}
          onReply={onReply}
          onResolve={onResolve}
          setIsEditing={setIsEditing}
          setIsMenuOpen={setIsMenuOpen}
          t={t}
        />
      </div>

      {comment.selection && isRootComment && (
        <button
          className={`my-1 block w-full border-l-2 py-0.5 pl-1.5 text-left text-[11px] font-mono italic cursor-pointer ${t("border-purple-500/60 bg-white/5 text-text-dark/70 hover:bg-white/10", "border-purple-500/60 bg-black/5 text-text-light/70 hover:bg-black/10")}`}
          onClick={handleTextClick}
          type="button"
        >
          "{comment.selection}"
        </button>
      )}

      {isEditing ? (
        <div className="mt-1 space-y-1">
          <textarea
            className={`w-full border p-1 text-[11px] placeholder:text-[10px] placeholder:opacity-50 outline-none focus:ring-1 focus:ring-purple-500/50 ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            value={editContent}
          />
          <div className="flex items-center justify-end gap-1">
            <button
              className={`border px-2 py-0.5 text-[10px] lowercase ${t("border-border-dark text-text-dark/50 hover:text-text-dark", "border-border-light text-text-light/50 hover:text-text-light")}`}
              onClick={() => setIsEditing(false)}
              type="button"
            >
              cancel
            </button>
            <button
              className="border border-purple-600/60 bg-purple-600/20 px-2 py-0.5 text-[10px] lowercase text-purple-400 hover:bg-purple-600/30 dark:text-purple-300 disabled:opacity-50 transition-colors"
              disabled={isSubmitting || !editContent.trim()}
              onClick={() => void handleSaveEdit()}
              type="button"
            >
              save
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`whitespace-pre-wrap text-[11px] leading-relaxed ${t("text-text-dark/80", "text-text-light/80")}`}
        >
          {comment.content}
        </p>
      )}
    </div>
  );
};
