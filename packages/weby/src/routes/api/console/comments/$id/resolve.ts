import { createFileRoute } from "@tanstack/react-router";
import { resolveComment } from "#/server/backy";
import type { ResolveCommentInput } from "#/shared/types";

export const Route = createFileRoute("/api/console/comments/$id/resolve")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await request.json()) as ResolveCommentInput;
        const comment = await resolveComment(params.id, body, cookieHeader);
        return Response.json(comment);
      },
    },
  },
});
