/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { shortenConsolePageShare } from "#/server/backy";

export const Route = createFileRoute("/api/console/pages/$id/share/shorten")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const result = await shortenConsolePageShare(params.id, cookieHeader);
        return Response.json(result);
      },
    },
  },
});
