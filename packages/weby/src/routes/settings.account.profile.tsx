import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTheme } from "../hooks/use-theme";
import { ProfileSettings } from "../components/settings/profile-settings";

const SettingsProfileRouteComponent = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  useEffect(() => {
    document.title = "verso — profile";
    return () => {
      document.title = "verso — console";
    };
  }, []);

  return (
    <div className={`min-h-full ${t("text-text-dark", "text-text-light")}`}>
      <ProfileSettings />
    </div>
  );
};

export const Route = createFileRoute("/settings/account/profile")({
  component: SettingsProfileRouteComponent,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});
