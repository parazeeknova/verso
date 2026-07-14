import { createFileRoute } from "@tanstack/react-router";
import { postBacky } from "#/server/backy";
import { forwardSanitizedCookies } from "#/server/cookie-sanitizer";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const backyRes = await postBacky("auth/login", body);
        const data = await backyRes
          .text()
          .catch(() => '{"error":"authentication service unavailable"}');
        const responseHeaders = new Headers({ "Content-Type": "application/json" });
        forwardSanitizedCookies(backyRes, responseHeaders);
        return new Response(data, {
          headers: responseHeaders,
          status: backyRes.status,
        });
      },
    },
  },
});
