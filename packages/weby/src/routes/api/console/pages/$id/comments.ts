import { createFileRoute } from "@tanstack/react-router";
import { createComment, getComments } from "#/server/backy";
import type { CreateCommentInput } from "#/shared/types";

export const Route = createFileRoute("/api/console/pages/$id/comments")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        const comments = await getComments(params.id, cookieHeader ?? undefined);
        return Response.json(comments ?? []);
      },
      POST: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        const body = (await request.json()) as CreateCommentInput;
        const comment = await createComment(params.id, body, cookieHeader ?? undefined);
        return Response.json(comment, { status: 201 });
      },
    },
  },
});
