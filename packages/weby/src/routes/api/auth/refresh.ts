import { createFileRoute } from "@tanstack/react-router";
import { postBackyWithCookies } from "#/server/backy";
import { forwardSanitizedCookies } from "#/server/cookie-sanitizer";

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        const backyRes = await postBackyWithCookies("auth/refresh", {}, cookieHeader);
        const data = await backyRes.json().catch(() => ({ status: "error" }));
        const responseHeaders = new Headers();
        forwardSanitizedCookies(backyRes, responseHeaders);
        return Response.json(data, { headers: responseHeaders, status: backyRes.status });
      },
    },
  },
});
