import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { CommentItem, CommentRealtimeEvent } from "#/shared/types";
import { getCommentsQueryKey } from "./use-comments";

export const useCommentStream = (pageId: string | undefined, enabled = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pageId || !enabled) {
      return;
    }

    const streamUrl = `/api/console/pages/${encodeURIComponent(pageId)}/comments/stream`;
    const es = new EventSource(streamUrl, { withCredentials: true });

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as CommentRealtimeEvent;
        if (!data.operation) {
          return;
        }

        queryClient.setQueryData<CommentItem[]>(getCommentsQueryKey(pageId), (oldComments = []) => {
          switch (data.operation) {
            case "commentCreated": {
              if (!data.comment) {
                return oldComments;
              }
              const exists = oldComments.some((c) => c.id === data.comment?.id);
              if (exists) {
                return oldComments.map((c) => (c.id === data.comment?.id ? data.comment : c));
              }
              return [...oldComments, data.comment];
            }
            case "commentUpdated":
            case "commentResolved": {
              if (!data.comment) {
                return oldComments;
              }
              return oldComments.map((c) => (c.id === data.comment?.id ? data.comment : c));
            }
            case "commentDeleted": {
              if (!data.commentId) {
                return oldComments;
              }
              return oldComments.filter(
                (c) => c.id !== data.commentId && c.parentCommentId !== data.commentId,
              );
            }
            default: {
              return oldComments;
            }
          }
        });
      } catch {
        void queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(pageId) });
      }
    };

    const handleError = () => {
      // EventSource reconnects automatically on failure
    };

    es.addEventListener("message", handleMessage);
    es.addEventListener("error", handleError);

    return () => {
      es.removeEventListener("message", handleMessage);
      es.removeEventListener("error", handleError);
      es.close();
    };
  }, [pageId, enabled, queryClient]);
};
