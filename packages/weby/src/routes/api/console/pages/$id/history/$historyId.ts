import { createFileRoute } from "@tanstack/react-router";
import { BackyError, deletePageHistoryEntry, getPageHistoryEntry } from "#/server/backy";

export const Route = createFileRoute("/api/console/pages/$id/history/$historyId")({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const res = await deletePageHistoryEntry(params.id, params.historyId, cookieHeader);
          return Response.json(res ?? { success: true });
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
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const entry = await getPageHistoryEntry(params.id, params.historyId, cookieHeader);
          if (!entry) {
            return Response.json({ error: "History entry not found" }, { status: 404 });
          }
          return Response.json(entry);
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
