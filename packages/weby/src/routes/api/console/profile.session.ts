import { createFileRoute } from "@tanstack/react-router";
import { getSessionInfo, BackyError } from "../../../server/backy";

export const Route = createFileRoute("/api/console/profile/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const session = await getSessionInfo(cookieHeader);
          return Response.json(session);
        } catch (error) {
          if (error instanceof BackyError) {
            return Response.json({ error: "failed to get session" }, { status: error.status });
          }
          throw error;
        }
      },
    },
  },
});
