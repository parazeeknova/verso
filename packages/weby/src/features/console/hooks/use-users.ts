import type { ConsoleUser } from "#/shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";

export const useUsers = () =>
  useQuery<ConsoleUser[]>({
    queryFn: ({ signal }) => fetchProtected<ConsoleUser[]>("/api/console/users", { signal }),
    queryKey: ["users"],
    staleTime: 30 * 1000,
  });

export const useUserById = (id: string, options?: { enabled?: boolean }) =>
  useQuery<ConsoleUser>({
    enabled: (options?.enabled ?? true) && id !== "",
    queryFn: ({ signal }) =>
      fetchProtected<ConsoleUser>(`/api/console/users/${encodeURIComponent(id)}`, { signal }),
    queryKey: ["userById", id],
    staleTime: 60 * 1000,
  });

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetchProtected<{ status: string }>(`/api/console/users/${id}/role`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUserActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchProtected<{ status: string }>(`/api/console/users/${id}/active`, {
        body: JSON.stringify({ is_active: isActive }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchProtected<{ status: string }>(`/api/console/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
