import { createFileRoute } from "@tanstack/react-router";
import { BackyError, getPagePresence, postPagePresence } from "#/server/backy";

export const Route = createFileRoute("/api/console/pages/$id/presence")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const cookieHeader = request?.headers?.get("cookie") ?? undefined;
        try {
          const result = await getPagePresence(params.id, cookieHeader);
          return Response.json(result);
        } catch (error) {
          if (error instanceof BackyError) {
            let bodyJson: unknown;
            try {
              bodyJson = JSON.parse(error.body);
            } catch {
              bodyJson = { error: error.message };
            }
            return Response.json(bodyJson, { status: error.status });
          }
          throw error;
        }
      },
      POST: async ({ params, request }) => {
        const cookieHeader = request?.headers?.get("cookie") ?? undefined;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
        }
        try {
          const result = await postPagePresence(params.id, body, cookieHeader);
          return Response.json(result);
        } catch (error) {
          if (error instanceof BackyError) {
            let bodyJson: unknown;
            try {
              bodyJson = JSON.parse(error.body);
            } catch {
              bodyJson = { error: error.message };
            }
            return Response.json(bodyJson, { status: error.status });
          }
          throw error;
        }
      },
    },
  },
});
