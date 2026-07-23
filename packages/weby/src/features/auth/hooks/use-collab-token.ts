import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "./fetch-protected";
import { useAuth } from "./use-auth";

export interface CollabTokenResponse {
  token: string;
}

export const useCollabToken = (options?: { enabled?: boolean; userId?: string }) => {
  const { data: user } = useAuth();
  const activeUserId = options?.userId ?? user?.id;
  const isEnabled = options?.enabled ?? true;

  return useQuery<CollabTokenResponse>({
    enabled: isEnabled,
    queryFn: ({ signal }) =>
      fetchProtected<CollabTokenResponse>("/api/console/auth/collab-token", {
        method: "POST",
        signal,
      }),
    queryKey: ["collabToken", activeUserId ?? "current"],
    // Refetch every 10 minutes to match 15-minute token TTL
    refetchInterval: 10 * 60 * 1000,
    // 5 minutes stale time
    staleTime: 5 * 60 * 1000,
  });
};
