import { createFileRoute } from "@tanstack/react-router";
import { createComment, getComments } from "#/server/backy";
import type { CreateCommentInput } from "#/shared/types";

export const Route = createFileRoute("/api/console/pages/$id/comments")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const comments = await getComments(params.id, cookieHeader);
        return Response.json(comments ?? []);
      },
      POST: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await request.json()) as CreateCommentInput;
        const comment = await createComment(params.id, body, cookieHeader);
        return Response.json(comment, { status: 201 });
      },
    },
  },
});
