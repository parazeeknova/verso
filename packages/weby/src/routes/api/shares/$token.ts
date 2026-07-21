import { createFileRoute } from "@tanstack/react-router";
import { BackyError, getPublicShare } from "#/server/backy";
import { checkRateLimit } from "#/server/rate-limit";

export const Route = createFileRoute("/api/shares/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const ip =
          request?.headers?.get("x-forwarded-for") ??
          request?.headers?.get("x-real-ip") ??
          "global";
        if (!checkRateLimit(ip)) {
          return Response.json({ error: "Too many requests" }, { status: 429 });
        }
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
