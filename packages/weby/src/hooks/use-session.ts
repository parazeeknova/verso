import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "./fetch-protected";

export interface SessionInfo {
  device_name: string;
  last_seen_at: string;
}

export const useSessionInfo = () =>
  useQuery<SessionInfo>({
    queryFn: ({ signal }) =>
      fetchProtected<SessionInfo>("/api/console/profile/session", { signal }),
    queryKey: ["sessionInfo"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
