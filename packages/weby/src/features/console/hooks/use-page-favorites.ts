import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";

export const useTogglePageFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) =>
      fetchProtected<{ favorited: boolean }>(`/api/console/pages/${pageId}/favorite`, {
        method: "POST",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pageFavorites"] });
      queryClient.setQueryData(["pageFavorited", variables], (_old) => ({
        favorited: _data.favorited,
      }));
    },
  });
};

export const useIsPageFavorited = (pageId: string, options?: { enabled?: boolean }) =>
  useQuery<{ favorited: boolean }>({
    enabled: (options?.enabled ?? true) && pageId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<{ favorited: boolean }>(`/api/console/pages/${pageId}/favorited`, { signal }),
    queryKey: ["pageFavorited", pageId],
    refetchOnMount: true,
    staleTime: 30 * 1000,
  });

export const useFavoritedPages = () =>
  useQuery<string[]>({
    queryFn: ({ signal }) => fetchProtected<string[]>("/api/console/pages/favorites", { signal }),
    queryKey: ["pageFavorites"],
    refetchOnMount: true,
    staleTime: 30 * 1000,
  });
