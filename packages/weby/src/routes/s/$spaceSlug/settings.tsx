import { createFileRoute, redirect } from "@tanstack/react-router";
import { SpaceSettings } from "#/features/space/components/space-settings";

export const Route = createFileRoute("/s/$spaceSlug/settings")({
  beforeLoad: ({ params }) => {
    if (params.spaceSlug === "nospace") {
      throw redirect({ to: "/home" });
    }
  },
  component: SpaceSettings,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});
