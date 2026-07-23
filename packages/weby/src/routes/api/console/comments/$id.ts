import { createFileRoute } from "@tanstack/react-router";
import { deleteComment, updateComment } from "#/server/backy";
import type { UpdateCommentInput } from "#/shared/types";

export const Route = createFileRoute("/api/console/comments/$id")({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const res = await deleteComment(params.id, cookieHeader);
        return Response.json(res);
      },
      PATCH: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await request.json()) as UpdateCommentInput;
        const comment = await updateComment(params.id, body, cookieHeader);
        return Response.json(comment);
      },
    },
  },
});
