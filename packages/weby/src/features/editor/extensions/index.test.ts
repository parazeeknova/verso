import { describe, expect, it } from "vitest";
import { getCompactCollaboratorName } from "./index";

describe("getCompactCollaboratorName", () => {
  it("removes the guest suffix and keeps the first name", () => {
    expect(getCompactCollaboratorName("Piplup (Guest)")).toBe("Piplup");
    expect(getCompactCollaboratorName("Ada Lovelace")).toBe("Ada");
  });

  it("truncates long names", () => {
    expect(getCompactCollaboratorName("Alexanderthegreat")).toBe("Alexandertheg…");
  });
});
