import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";

export const useWatchPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) =>
      fetchProtected<{ watching: boolean }>(`/api/console/pages/${pageId}/watch`, {
        method: "POST",
      }),
    onSuccess: (data, pageId) => {
      queryClient.setQueryData(["pageWatching", pageId], { watching: data.watching });
    },
  });
};

export const useIsPageWatching = (pageId: string, options?: { enabled?: boolean }) =>
  useQuery<{ watching: boolean }>({
    enabled: (options?.enabled ?? true) && pageId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<{ watching: boolean }>(`/api/console/pages/${pageId}/watching`, { signal }),
    queryKey: ["pageWatching", pageId],
    refetchOnMount: true,
    staleTime: 30 * 1000,
  });
