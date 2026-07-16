import type { Space, SpaceMemberMixed } from "#/shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";

export const useSpaces = (workspaceId: string) =>
  useQuery<Space[]>({
    enabled: workspaceId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<Space[]>(
        `/api/console/spaces?workspaceId=${encodeURIComponent(workspaceId)}`,
        { signal },
      ),
    queryKey: ["spaces", workspaceId],
    refetchOnMount: true,
    staleTime: 60 * 1000,
  });

export const useSpaceBySlug = (slug: string) =>
  useQuery<Space>({
    enabled: slug !== "",
    queryFn: ({ signal }) =>
      fetchProtected<Space>(`/api/console/spaces/by-slug/${encodeURIComponent(slug)}`, { signal }),
    queryKey: ["spaceBySlug", slug],
    refetchOnMount: true,
    staleTime: 60 * 1000,
  });

export const useSpaceById = (id: string, options?: { enabled?: boolean }) =>
  useQuery<Space>({
    enabled: (options?.enabled ?? true) && id !== "",
    queryFn: ({ signal }) =>
      fetchProtected<Space>(`/api/console/spaces/${encodeURIComponent(id)}`, { signal }),
    queryKey: ["spaceById", id],
    refetchOnMount: true,
    staleTime: 60 * 1000,
  });

export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      slug: string;
      icon?: string;
      description?: string;
      workspaceId: string;
    }) =>
      fetchProtected<Space>("/api/console/spaces", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useUpdateSpace = () => {
  const queryClient = useQueryClient();
  return useMutation<
    Space,
    Error,
    {
      id: string;
      input: {
        name: string;
        slug: string;
        icon?: string;
        description?: string;
        headerImage?: string;
        visibility?: string;
        defaultRole?: string;
      };
    },
    { previous?: { slug: string; space?: Space; spaceBySlug?: Space } }
  >({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        name: string;
        slug: string;
        icon?: string;
        description?: string;
        headerImage?: string;
        visibility?: string;
        defaultRole?: string;
      };
    }) =>
      fetchProtected<Space>(`/api/console/spaces/${id}`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["spaceBySlug", context.previous.slug],
          context.previous.spaceBySlug,
        );
        queryClient.setQueryData(["space", _variables.id], context.previous.space);
      }
    },
    onMutate: async ({ id, input }) => {
      const { slug } = input;
      await queryClient.cancelQueries({ queryKey: ["spaceBySlug", slug] });
      await queryClient.cancelQueries({ queryKey: ["space", id] });
      const previous = {
        slug,
        space: queryClient.getQueryData<Space>(["space", id]),
        spaceBySlug: queryClient.getQueryData<Space>(["spaceBySlug", slug]),
      };
      queryClient.setQueryData<Space>(["spaceBySlug", slug], (old) => {
        if (!old) {
          return old;
        }
        return { ...old, ...input };
      });
      queryClient.setQueryData<Space>(["space", id], (old) => {
        if (!old) {
          return old;
        }
        return { ...old, ...input };
      });
      return { previous };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["space", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["spaceBySlug"] });
    },
  });
};

export const useDeleteSpace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.removeQueries({ queryKey: ["pageTree", id] });
      queryClient.removeQueries({ queryKey: ["space", id] });
      queryClient.removeQueries({
        predicate: (query) => {
          const data = query.state.data as Space | undefined;
          return data?.id === id;
        },
        queryKey: ["spaceBySlug"],
      });
      queryClient.invalidateQueries({ queryKey: ["pageTree"] });
    },
  });
};

export const useSpaceMembers = (spaceId: string) =>
  useQuery<SpaceMemberMixed[]>({
    enabled: spaceId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<SpaceMemberMixed[]>(`/api/console/spaces/${spaceId}/members`, { signal }),
    queryKey: ["spaceMembers", spaceId],
    staleTime: 30 * 1000,
  });

export const useUpdateSpaceMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, userId, role }: { spaceId: string; userId: string; role: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/members/${userId}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
    },
  });
};

export const useRemoveSpaceMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, userId }: { spaceId: string; userId: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/members/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useAddSpaceMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, spaceId, userId }: { role: string; spaceId: string; userId: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/members/${userId}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useAddSpaceGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, role, spaceId }: { groupId: string; role: string; spaceId: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/groups/${groupId}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useUpdateSpaceGroupRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, role, spaceId }: { groupId: string; role: string; spaceId: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/groups/${groupId}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
    },
  });
};

export const useRemoveSpaceGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, spaceId }: { groupId: string; spaceId: string }) =>
      fetchProtected<{ status: string }>(`/api/console/spaces/${spaceId}/groups/${groupId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMembers", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
};

export const useToggleSpaceFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) =>
      fetchProtected<{ favorited: boolean }>(`/api/console/spaces/${spaceId}/favorite`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaceFavorites"] });
    },
  });
};

export const useIsSpaceFavorited = (spaceId: string) =>
  useQuery<{ favorited: boolean }>({
    enabled: spaceId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<{ favorited: boolean }>(`/api/console/spaces/${spaceId}/favorited`, {
        signal,
      }),
    queryKey: ["spaceFavorites", spaceId],
    staleTime: 30 * 1000,
  });

export const useFavoritedSpaces = () =>
  useQuery<Space[]>({
    queryFn: ({ signal }) => fetchProtected<Space[]>("/api/console/spaces/favorites", { signal }),
    queryKey: ["spaceFavorites"],
    staleTime: 30 * 1000,
  });
