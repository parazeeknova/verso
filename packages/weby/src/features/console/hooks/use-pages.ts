import type {
  ConsolePage,
  ConsolePageDetail,
  CreatePageInput,
  MovePageInput,
  PageHistoryItem,
  PageTreeItem,
  RestorePageInput,
  UpdatePageInput,
  PageShare,
} from "#/shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { fetchProtected } from "#/features/auth/hooks/fetch-protected";

type PageTreeItemResponse = Omit<PageTreeItem, "parentPageId"> & {
  parentPageId?: string | null;
};

const normalizeParentPageId = (parentPageId: string | null | undefined): string | null => {
  if (parentPageId === null || parentPageId === undefined) {
    return null;
  }
  const trimmedParentPageId = parentPageId.trim();
  return trimmedParentPageId.length > 0 ? trimmedParentPageId : null;
};

const normalizePageTreeItems = (items: PageTreeItemResponse[]): PageTreeItem[] =>
  items.map((item) => ({
    ...item,
    parentPageId: normalizeParentPageId(item.parentPageId),
  }));

export const usePageTree = (spaceId?: string) =>
  useQuery<PageTreeItem[]>({
    enabled: !!spaceId,
    queryFn: async ({ signal }) => {
      const items = await fetchProtected<PageTreeItemResponse[]>(
        `/api/console/pages/tree?spaceId=${encodeURIComponent(spaceId as string)}`,
        { signal },
      );
      return normalizePageTreeItems(items);
    },
    queryKey: ["pageTree", spaceId],
    refetchOnMount: true,
    staleTime: 10 * 1000,
  });

export const usePageChildren = (parentId: string | null) =>
  useQuery<PageTreeItem[]>({
    enabled: parentId !== null,
    queryFn: ({ signal }) =>
      fetchProtected<PageTreeItem[]>(`/api/console/pages/${parentId}/children`, {
        signal,
      }),
    queryKey: ["pageChildren", parentId],
    staleTime: 30 * 1000,
  });

export const useConsolePage = (pageId: string, options?: { enabled?: boolean }) =>
  useQuery<ConsolePageDetail>({
    enabled: (options?.enabled ?? true) && pageId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<ConsolePageDetail>(`/api/console/pages/${pageId}`, { signal }),
    queryKey: ["consolePage", pageId],
    staleTime: 30 * 1000,
  });
export const usePageBySpaceAndSlug = (
  spaceId: string,
  slugId: string,
  options?: { enabled?: boolean },
) =>
  useQuery<ConsolePageDetail>({
    enabled: (options?.enabled ?? true) && spaceId !== "" && slugId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<ConsolePageDetail>(
        `/api/console/spaces/${encodeURIComponent(spaceId)}/pages/by-slug/${encodeURIComponent(slugId)}`,
        { signal },
      ),
    queryKey: ["consolePage", spaceId, slugId],
    staleTime: 30 * 1000,
  });

export const useConsolePages = () =>
  useQuery<ConsolePage[]>({
    queryFn: ({ signal }) => fetchProtected<ConsolePage[]>("/api/console/pages", { signal }),
    queryKey: ["consolePages"],
    refetchOnMount: true,
    staleTime: 30 * 1000,
  });

export const useCreatePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) =>
      fetchProtected<ConsolePageDetail>("/api/console/pages", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pageTree", variables.spaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["consolePages"] });
    },
  });
};
export const useUpdatePage = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ConsolePageDetail,
    Error,
    { id: string; input: UpdatePageInput },
    {
      previousPages?: [QueryKey, ConsolePageDetail | undefined][];
      touchedKeys?: (keyof ConsolePageDetail)[];
    }
  >({
    mutationFn: ({ id, input }: { id: string; input: UpdatePageInput }) =>
      fetchProtected<ConsolePageDetail>(`/api/console/pages/${id}`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onError: (_err, _variables, context) => {
      const previousPages = context?.previousPages;
      const touched = context?.touchedKeys;
      if (previousPages && touched) {
        for (const [queryKey, prev] of previousPages) {
          if (!prev) {
            continue;
          }
          queryClient.setQueryData<ConsolePageDetail>(queryKey, (current) => {
            if (!current) {
              return current;
            }
            const restored = { ...current };
            for (const key of touched) {
              if (key in prev) {
                (restored as Record<string, unknown>)[key as string] = (
                  prev as unknown as Record<string, unknown>
                )[key as string];
              }
            }
            return restored;
          });
        }
      }
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["consolePage"] });
      const queries = queryClient.getQueriesData<ConsolePageDetail>({
        exact: false,
        queryKey: ["consolePage"],
      });
      const previousPages: [QueryKey, ConsolePageDetail | undefined][] = [];

      for (const [queryKey, pageData] of queries) {
        if (pageData && pageData.id === id) {
          previousPages.push([queryKey, pageData]);
          queryClient.setQueryData<ConsolePageDetail>(queryKey, {
            ...pageData,
            ...input,
          });
        }
      }

      const touchedKeys = Object.keys(input) as (keyof ConsolePageDetail)[];
      return { previousPages, touchedKeys };
    },
    onSuccess: (data, variables) => {
      const queries = queryClient.getQueriesData<ConsolePageDetail>({
        exact: false,
        queryKey: ["consolePage"],
      });
      for (const [queryKey, pageData] of queries) {
        if (pageData && pageData.id === data.id) {
          queryClient.setQueryData<ConsolePageDetail>(queryKey, data);
        }
      }

      const { input } = variables;
      if (input.title !== undefined || input.icon !== undefined || input.isLocked !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["pageTree"] });
        queryClient.invalidateQueries({ queryKey: ["consolePages"] });
      }
    },
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ status: string }>(`/api/console/pages/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["consolePages"] });
      queryClient.removeQueries({
        predicate: (query) => {
          const data = query.state.data as ConsolePageDetail | undefined;
          return data?.id === id || query.queryKey.includes(id);
        },
        queryKey: ["consolePage"],
      });
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const usePublishPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ id: string; isPublished: boolean; updatedAt: string }>(
        `/api/console/pages/${id}/publish`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolePage"] });
      queryClient.invalidateQueries({ queryKey: ["consolePages"] });
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const useUnpublishPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ id: string; isPublished: boolean; updatedAt: string }>(
        `/api/console/pages/${id}/unpublish`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolePage"] });
      queryClient.invalidateQueries({ queryKey: ["consolePages"] });
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const useMovePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MovePageInput }) =>
      fetchProtected<{
        id: string;
        position: string;
        parentPageId: string | null;
        updatedAt: string;
      }>(`/api/console/pages/${id}/move`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
      queryClient.invalidateQueries({ queryKey: ["pageChildren"] });
    },
  });
};

export const usePageHistory = (pageId: string, options?: { enabled?: boolean }) =>
  useQuery<PageHistoryItem[]>({
    enabled: (options?.enabled ?? true) && pageId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<PageHistoryItem[]>(`/api/console/pages/${pageId}/history`, { signal }),
    queryKey: ["pageHistory", pageId],
    staleTime: 30 * 1000,
  });

export const useRestorePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RestorePageInput }) =>
      fetchProtected<ConsolePageDetail>(`/api/console/pages/${id}/restore`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolePage"] });
      queryClient.invalidateQueries({ queryKey: ["pageHistory"] });
      queryClient.invalidateQueries({ queryKey: ["consolePages"] });
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const useDeleteHistoryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, historyId }: { pageId: string; historyId: string }) =>
      fetchProtected<{ success: boolean }>(`/api/console/pages/${pageId}/history/${historyId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pageHistory", variables.pageId] });
    },
  });
};

export const useDeleteAllPageHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) =>
      fetchProtected<{ success: boolean }>(`/api/console/pages/${pageId}/history`, {
        method: "DELETE",
      }),
    onSuccess: (_data, pageId) => {
      queryClient.invalidateQueries({ queryKey: ["pageHistory", pageId] });
    },
  });
};

export const usePageShare = (pageId: string, options?: { enabled?: boolean }) =>
  useQuery<PageShare>({
    enabled: (options?.enabled ?? true) && pageId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<PageShare>(`/api/console/pages/${pageId}/share`, { signal }),
    queryKey: ["pageShare", pageId],
  });

export const useUpdatePageShare = () => {
  const queryClient = useQueryClient();
  return useMutation<
    PageShare,
    Error,
    { pageId: string; isEnabled: boolean; searchIndexing: boolean; accessLevel?: string }
  >({
    mutationFn: ({ pageId, isEnabled, searchIndexing, accessLevel }) =>
      fetchProtected<PageShare>(`/api/console/pages/${pageId}/share`, {
        body: JSON.stringify({ accessLevel, isEnabled, searchIndexing }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["pageShare", variables.pageId], data);
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const useShortenPageShare = () => {
  const queryClient = useQueryClient();
  return useMutation<PageShare, Error, string>({
    mutationFn: (pageId) =>
      fetchProtected<PageShare>(`/api/console/pages/${pageId}/share/shorten`, {
        method: "POST",
      }),
    onSuccess: (data, pageId) => {
      queryClient.setQueryData(["pageShare", pageId], data);
    },
  });
};
