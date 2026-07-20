/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useTheme } from "#/shared/hooks/use-theme";
import { useEffect } from "react";

interface ShortLinkResponse {
  shareToken: string;
}

const ShortLinkComponent = () => {
  const { shortcode } = Route.useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const { data, isPending, isError } = useQuery<ShortLinkResponse>({
    queryFn: () => fetchProtected<ShortLinkResponse>(`/api/short/${shortcode}`),
    queryKey: ["shortLink", shortcode],
    retry: false,
  });

  useEffect(() => {
    if (data?.shareToken) {
      navigate({
        params: { token: data.shareToken },
        replace: true,
        to: "/share/$token",
      });
    }
  }, [data, navigate]);

  if (isPending) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center text-xs lowercase ${t(
          "bg-bg-dark text-text-dark/40",
          "bg-bg-light text-text-light/40",
        )}`}
      >
        redirecting...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center text-xs lowercase text-red-400 ${t(
          "bg-bg-dark",
          "bg-bg-light",
        )}`}
      >
        short link not found or has been disabled
      </div>
    );
  }

  return null;
};

export const Route = createFileRoute("/sh/$shortcode")({
  component: ShortLinkComponent,
});
