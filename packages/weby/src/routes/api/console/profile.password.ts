import { createFileRoute } from "@tanstack/react-router";
import { changePassword, BackyError } from "../../../server/backy";

export const Route = createFileRoute("/api/console/profile/password")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const body = (await request.json()) as { current_password: string; new_password: string };
          const result = await changePassword(body, cookieHeader);
          return Response.json(result);
        } catch (error) {
          if (error instanceof BackyError) {
            return Response.json({ error: "failed to change password" }, { status: error.status });
          }
          throw error;
        }
      },
    },
  },
});
