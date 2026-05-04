import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "./fetch-protected";

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchProtected<{ status: string }>("/api/console/profile/session/revoke", {
        method: "POST",
      });
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessionInfo"] });
    },
  });
};
