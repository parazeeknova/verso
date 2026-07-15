import { createFileRoute } from "@tanstack/react-router";
import { Agent } from "undici";

export const Route = createFileRoute("/api/console/notifications/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const backendOrigin =
          process.env.BACKY_ORIGIN?.replace(/\/$/, "") ?? "http://localhost:7000";
        const backendUrl = `${backendOrigin}/api/console/notifications/stream`;

        // Disable the default 300s bodyTimeout/headersTimeout so idle SSE
        // streams aren't killed (the backend also sends a periodic heartbeat).
        const dispatcher = new Agent({ bodyTimeout: 0, headersTimeout: 0 });
        const fetchOptions = {
          dispatcher,
          headers: {
            Accept: "text/event-stream",
            Cookie: request.headers.get("cookie") ?? "",
          },
          signal: request.signal,
        } satisfies RequestInit & { dispatcher: Agent };

        const backendRes = await fetch(backendUrl, fetchOptions);

        return new Response(backendRes.body, {
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Content-Type": backendRes.headers.get("Content-Type") ?? "text/event-stream",
            "X-Accel-Buffering": "no",
          },
          status: backendRes.status,
        });
      },
    },
  },
});
