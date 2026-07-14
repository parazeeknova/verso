import { createFileRoute } from "@tanstack/react-router";
import { uploadBacky } from "#/server/backy";

export const Route = createFileRoute("/api/console/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const formData = await request.formData();
          const backyResponse = await uploadBacky("console/upload", formData, cookieHeader);

          if (!backyResponse.ok) {
            const bodyText = await backyResponse.text().catch(() => "");
            return new Response(bodyText, {
              status: backyResponse.status,
              statusText: backyResponse.statusText,
            });
          }

          const responseData = await backyResponse.json();
          return Response.json(responseData);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          return Response.json({ error: errMsg }, { status: 500 });
        }
      },
    },
  },
});
