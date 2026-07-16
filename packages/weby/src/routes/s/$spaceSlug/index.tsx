import { createFileRoute, redirect } from "@tanstack/react-router";
import { SpaceOverview } from "#/features/space/components/space-overview";

export const Route = createFileRoute("/s/$spaceSlug/")({
  beforeLoad: ({ params }) => {
    if (params.spaceSlug === "nospace") {
      throw redirect({ to: "/home" });
    }
  },
  component: SpaceOverview,
});
