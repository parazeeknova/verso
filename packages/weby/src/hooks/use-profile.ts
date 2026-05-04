import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProtected } from "./fetch-protected";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; avatar_url: string }) => {
      const res = await fetchProtected<{ status: string }>("/api/console/profile", {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await fetchProtected<{ status: string }>("/api/console/profile/password", {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      return res;
    },
  });
