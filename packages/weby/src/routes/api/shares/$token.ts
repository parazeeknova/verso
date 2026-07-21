/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { BackyError, getPublicShare } from "#/server/backy";

export const Route = createFileRoute("/api/shares/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const result = await getPublicShare(params.token);
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
