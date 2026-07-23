import { createFileRoute } from "@tanstack/react-router";
import { Agent } from "undici";

const sseDispatcher = new Agent({ bodyTimeout: 0, headersTimeout: 0 });

export const Route = createFileRoute("/api/console/pages/$id/comments/stream")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const backendOrigin =
          process.env.BACKY_ORIGIN?.replace(/\/$/, "") ?? "http://localhost:7000";
        const backendUrl = `${backendOrigin}/api/console/pages/${encodeURIComponent(params.id)}/comments/stream`;

        const fetchOptions = {
          dispatcher: sseDispatcher,
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
