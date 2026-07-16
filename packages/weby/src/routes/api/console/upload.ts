import { createFileRoute } from "@tanstack/react-router";
import { uploadBacky, getConsolePage } from "#/server/backy";
import { logger } from "#/shared/lib/logger";

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
          const pageId = formData.get("pageId") as string;
          if (!pageId) {
            return Response.json({ error: "pageId is required" }, { status: 400 });
          }

          // Authorize the requested page before accepting the upload
          const page = await getConsolePage(pageId, cookieHeader);
          if (!page || !page.editable) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const path = `console/upload?pageId=${encodeURIComponent(pageId)}`;
          const backyResponse = await uploadBacky(path, formData, cookieHeader);

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
          logger.error({ error }, "upload handler exception");
          return Response.json({ error: "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
});
