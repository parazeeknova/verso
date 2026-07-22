import { describe, expect, it } from "vitest";
import { collaborationResyncInterval, createCollaborationProvider } from "./collaboration-provider";

describe("createCollaborationProvider", () => {
  it("uses a y-websocket room path and collaboration token", () => {
    const provider = createCollaborationProvider(
      "ws://localhost:7000/ws/collab",
      "page.123",
      "collab-token",
      { connect: false },
    );

    expect(provider.url).toBe("ws://localhost:7000/ws/collab/page.123?token=collab-token");
    expect(provider.params).toEqual({ token: "collab-token" });
    expect(provider.disableBc).toBe(true);
    expect(provider._resyncInterval).not.toBe(0);

    provider.destroy();
  });

  it("keeps public share connections anonymous", () => {
    const provider = createCollaborationProvider(
      "ws://localhost:7000/ws/collab",
      "page.123",
      undefined,
      { connect: false },
    );

    expect(provider.url).toBe("ws://localhost:7000/ws/collab/page.123");
    expect(provider.params).toEqual({});
    expect(collaborationResyncInterval).toBe(15_000);

    provider.destroy();
  });
});
