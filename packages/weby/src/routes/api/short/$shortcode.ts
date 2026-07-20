/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { getPublicShort } from "#/server/backy";

export const Route = createFileRoute("/api/short/$shortcode")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await getPublicShort(params.shortcode);
        return Response.json(result);
      },
    },
  },
});
