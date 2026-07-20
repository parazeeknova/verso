/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { getConsolePageShare, updateConsolePageShare } from "#/server/backy";

export const Route = createFileRoute("/api/console/pages/$id/share")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const result = await getConsolePageShare(params.id, cookieHeader);
        return Response.json(result);
      },
      PUT: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await request.json()) as {
          isEnabled: boolean;
          searchIndexing: boolean;
        };
        const result = await updateConsolePageShare(params.id, body, cookieHeader);
        return Response.json(result);
      },
    },
  },
});
