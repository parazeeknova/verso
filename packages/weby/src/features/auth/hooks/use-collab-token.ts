import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "./fetch-protected";

export interface CollabTokenResponse {
  token: string;
}

export const useCollabToken = () =>
  useQuery<CollabTokenResponse>({
    queryFn: ({ signal }) =>
      fetchProtected<CollabTokenResponse>("/api/console/auth/collab-token", {
        method: "POST",
        signal,
      }),
    queryKey: ["collabToken"],
    // Refetch every 12 hours
    refetchInterval: 12 * 60 * 60 * 1000,
    // 1 hour stale time
    staleTime: 60 * 60 * 1000,
  });
