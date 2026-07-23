import { createFileRoute } from "@tanstack/react-router";
import { BackyError, getPublicSharePresence, postPublicSharePresence } from "#/server/backy";

export const Route = createFileRoute("/api/shares/$token/presence")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const result = await getPublicSharePresence(params.token);
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
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
        }
        try {
          const result = await postPublicSharePresence(params.token, body);
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
