import { PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { useCreateComment } from "../hooks/use-comments";

interface CommentDialogProps {
  editor: Editor | null;
  pageId: string;
  isDarkMode: boolean;
  selectedText: string;
  onClose: () => void;
  onSuccess?: (commentId: string) => void;
}

export const CommentDialog = ({
  editor,
  pageId,
  isDarkMode,
  selectedText,
  onClose,
  onSuccess,
}: CommentDialogProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useCreateComment(pageId);

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await createMutation.mutateAsync({
        content: commentText,
        selection: selectedText,
        type: "inline",
      });

      if (editor && !editor.isDestroyed) {
        editor.chain().focus().setMark("comment", { commentId: created.id, resolved: false }).run();
      }

      setCommentText("");
      onSuccess?.(created.id);
      onClose();
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`w-72 border p-2 text-xs shadow-xl lowercase ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
    >
      <div className="flex items-center justify-between border-b pb-1 mb-1.5 border-border-dark/60">
        <span className="font-medium text-[11px]">add inline comment</span>
        <button
          className={`p-0.5 opacity-60 hover:opacity-100 ${t("text-text-dark", "text-text-light")}`}
          onClick={onClose}
          type="button"
        >
          <XIcon size={12} />
        </button>
      </div>

      {selectedText && (
        <div
          className={`mb-1.5 border-l-2 py-0.5 pl-1.5 font-mono text-[10px] italic border-purple-500/60 bg-purple-500/10 ${t("text-text-dark/80", "text-text-light/80")}`}
        >
          "{selectedText.slice(0, 100)}
          {selectedText.length > 100 ? "..." : ""}"
        </div>
      )}

      <div className="flex items-start gap-1.5">
        {user?.avatar_url ? (
          <img
            alt={user.name}
            className="mt-0.5 h-4 w-4 shrink-0 rounded-none object-cover border border-border-dark/40"
            src={user.avatar_url}
          />
        ) : (
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[8px] font-semibold uppercase ${t("border-border-dark bg-white/10 text-text-dark", "border-border-light bg-black/5 text-text-light")}`}
          >
            {(user?.name || "?").slice(0, 2)}
          </span>
        )}

        <div className="flex-1">
          <textarea
            autoFocus
            className={`w-full border p-1 text-[11px] placeholder:text-[10px] placeholder:opacity-50 outline-none focus:ring-1 focus:ring-purple-500/50 ${t("border-border-dark bg-bg-dark text-text-dark", "border-border-light bg-bg-light text-text-light")}`}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="write comment (Ctrl+Enter to send)..."
            rows={2}
            value={commentText}
          />

          <div className="mt-1 flex items-center justify-end gap-1">
            <button
              className={`border px-2 py-0.5 text-[10px] lowercase ${t("border-border-dark text-text-dark/50 hover:text-text-dark", "border-border-light text-text-light/50 hover:text-text-light")}`}
              onClick={onClose}
              type="button"
            >
              cancel
            </button>
            <button
              className="flex items-center gap-1 border border-purple-600/60 bg-purple-600/20 px-2 py-0.5 text-[10px] lowercase text-purple-400 hover:bg-purple-600/30 dark:text-purple-300 disabled:opacity-50 transition-colors"
              disabled={isSubmitting || !commentText.trim()}
              onClick={() => void handleSubmit()}
              type="button"
            >
              <PaperPlaneRightIcon size={10} />
              comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
