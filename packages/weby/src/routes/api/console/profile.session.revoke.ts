import { createFileRoute } from "@tanstack/react-router";
import { revokeSession, BackyError } from "../../../server/backy";

export const Route = createFileRoute("/api/console/profile/session/revoke")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const result = await revokeSession(cookieHeader);
          return Response.json(result);
        } catch (error) {
          if (error instanceof BackyError) {
            return Response.json({ error: "failed to revoke session" }, { status: error.status });
          }
          throw error;
        }
      },
    },
  },
});
