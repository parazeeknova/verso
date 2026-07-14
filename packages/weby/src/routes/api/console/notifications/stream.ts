import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/console/notifications/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const backendOrigin =
          process.env.BACKY_ORIGIN?.replace(/\/$/, "") ?? "http://localhost:7000";
        const backendUrl = `${backendOrigin}/api/console/notifications/stream`;

        // Undici-specific options: disable the default 300s bodyTimeout so
        // idle SSE streams aren't killed (the backend also sends a periodic
        // heartbeat). Cast to avoid TS complaints about non-standard fields.
        const fetchOptions = {
          bodyTimeout: 0,
          headers: {
            Accept: "text/event-stream",
            Cookie: request.headers.get("cookie") ?? "",
          },
          headersTimeout: 0,
          signal: request.signal,
        } as RequestInit & { bodyTimeout: number; headersTimeout: number };

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
