import { createFileRoute } from "@tanstack/react-router";
import { markNotificationRead } from "#/server/backy";

const handleMarkRead = async (id: string, cookieHeader: string | null) => {
  if (!cookieHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await markNotificationRead(id, cookieHeader);
  return Response.json(result);
};

export const Route = createFileRoute("/api/console/notifications/$id/read")({
  server: {
    handlers: {
      PATCH: ({ params, request }) => handleMarkRead(params.id, request.headers.get("cookie")),
      POST: ({ params, request }) => handleMarkRead(params.id, request.headers.get("cookie")),
      PUT: ({ params, request }) => handleMarkRead(params.id, request.headers.get("cookie")),
    },
  },
});
