/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { getPublicShare } from "#/server/backy";

export const Route = createFileRoute("/api/shares/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await getPublicShare(params.token);
        return Response.json(result);
      },
    },
  },
});
