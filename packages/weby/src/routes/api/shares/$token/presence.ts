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
        try {
          const body = (await request.json()) as unknown;
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
