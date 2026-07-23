import { describe, expect, it } from "vitest";
import { isPageOwnerPresence } from "./collaboration-presence";
import { getCompactCollaboratorName } from "../extensions";

describe("isPageOwnerPresence", () => {
  it("matches the awareness owner flag", () => {
    expect(isPageOwnerPresence({ isOwner: true }, "owner-id")).toBe(true);
    expect(isPageOwnerPresence({ isOwner: true })).toBe(true);
  });

  it("matches a collaborator id to the page creator", () => {
    expect(isPageOwnerPresence({ id: "owner-id" }, "owner-id")).toBe(true);
    expect(isPageOwnerPresence({ id: "owner-id " }, " owner-id")).toBe(true);
    expect(isPageOwnerPresence({ id: "guest-id" }, "owner-id")).toBe(false);
  });

  it("handles empty or missing creatorId gracefully", () => {
    expect(isPageOwnerPresence({ id: "guest-id" }, "")).toBe(false);
    expect(isPageOwnerPresence({ id: "guest-id" })).toBe(false);
    expect(isPageOwnerPresence({ id: "guest-id", isOwner: false }, "owner-id")).toBe(false);
  });
});

describe("getCompactCollaboratorName", () => {
  it("handles undefined or empty names safely", () => {
    expect(getCompactCollaboratorName()).toBe("Anonymous");
    expect(getCompactCollaboratorName("")).toBe("Anonymous");
  });

  it("strips guest suffix and returns first name", () => {
    expect(getCompactCollaboratorName("Pikachu (Guest)")).toBe("Pikachu");
    expect(getCompactCollaboratorName("John Doe (guest)")).toBe("John");
  });

  it("truncates very long first names", () => {
    expect(getCompactCollaboratorName("Supercalifragilisticexpialidocious")).toBe("Supercalifrag…");
  });
});
