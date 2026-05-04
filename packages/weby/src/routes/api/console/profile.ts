import { createFileRoute } from "@tanstack/react-router";
import { getUserProfile, updateProfile, BackyError } from "../../../server/backy";

export const Route = createFileRoute("/api/console/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const profile = await getUserProfile(cookieHeader);
          return Response.json(profile);
        } catch (error) {
          if (error instanceof BackyError) {
            return Response.json({ error: "failed to get profile" }, { status: error.status });
          }
          throw error;
        }
      },
      PUT: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const body = (await request.json()) as { name: string; avatar_url: string };
          const result = await updateProfile(body, cookieHeader);
          return Response.json(result);
        } catch (error) {
          if (error instanceof BackyError) {
            return Response.json({ error: "failed to update profile" }, { status: error.status });
          }
          throw error;
        }
      },
    },
  },
});
