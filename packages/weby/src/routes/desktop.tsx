import { createFileRoute } from "@tanstack/react-router";
import { DesktopFrontPage } from "#/features/auth/components/desktop-front-page";

export const Route = createFileRoute("/desktop")({
  component: DesktopFrontPage,
  head: () => ({
    meta: [
      { title: "verso — desktop" },
      { content: "verso desktop application", name: "description" },
    ],
  }),
});
