import { createFileRoute } from "@tanstack/react-router";
import { getCollabToken } from "#/server/backy";

export const Route = createFileRoute("/api/auth/collab-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const res = await getCollabToken(cookieHeader);
          return Response.json(res);
        } catch {
          return Response.json({ error: "Failed to issue collab token" }, { status: 500 });
        }
      },
    },
  },
});
