import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import type {
  CommentItem,
  CreateCommentInput,
  ResolveCommentInput,
  UpdateCommentInput,
} from "#/shared/types";

export const getCommentsQueryKey = (pageId: string | undefined) => ["comments", pageId];

export const useComments = (pageId: string | undefined, options?: { enabled?: boolean }) =>
  useQuery({
    enabled: Boolean(pageId) && (options?.enabled ?? true),
    queryFn: ({ signal }) =>
      fetchProtected<CommentItem[]>(`/api/console/pages/${pageId}/comments`, { signal }),
    queryKey: getCommentsQueryKey(pageId),
  });

export const useCreateComment = (pageId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      fetchProtected<CommentItem>(`/api/console/pages/${pageId}/comments`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(pageId) });
    },
  });
};

export const useUpdateComment = (pageId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateCommentInput }) =>
      fetchProtected<CommentItem>(`/api/console/comments/${commentId}`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(pageId) });
    },
  });
};

export const useDeleteComment = (pageId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      fetchProtected<{ status: string }>(`/api/console/comments/${commentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(pageId) });
    },
  });
};

export const useResolveComment = (pageId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: ResolveCommentInput }) =>
      fetchProtected<CommentItem>(`/api/console/comments/${commentId}/resolve`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(pageId) });
    },
  });
};
