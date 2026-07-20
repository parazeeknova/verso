import { createFileRoute } from "@tanstack/react-router";
import { deletePageHistory, getPageHistory } from "#/server/backy";

export const Route = createFileRoute("/api/console/pages/$id/history")({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const res = await deletePageHistory(params.id, cookieHeader);
        return Response.json(res ?? { success: true });
      },
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const history = await getPageHistory(params.id, cookieHeader);
        return Response.json(history ?? []);
      },
    },
  },
});
