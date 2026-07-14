import { createFileRoute } from "@tanstack/react-router";
import { getBacky } from "#/server/backy";

export const Route = createFileRoute("/api/console/files/$bucket/$filename")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const cookieHeader = request.headers.get("cookie");
        const headers: Record<string, string> = {};
        const range = request.headers.get("range");
        if (range) {
          headers["Range"] = range;
        }

        const backyResponse = await getBacky(
          `console/files/${encodeURIComponent(params.bucket)}/${encodeURIComponent(params.filename)}`,
          cookieHeader,
          Object.keys(headers).length > 0 ? headers : undefined,
        );

        if (!backyResponse.ok) {
          return new Response("file not found", { status: backyResponse.status });
        }

        const passthrough = new Headers();
        for (const [key, value] of backyResponse.headers.entries()) {
          if (key.toLowerCase() === "content-encoding") {
            continue;
          }
          passthrough.set(key, value);
        }
        if (!passthrough.has("content-type")) {
          passthrough.set("content-type", "application/octet-stream");
        }

        return new Response(backyResponse.body, {
          headers: passthrough,
          status: backyResponse.status,
        });
      },
    },
  },
});
