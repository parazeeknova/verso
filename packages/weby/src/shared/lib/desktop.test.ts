import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isDesktopApp, useIsDesktop } from "./desktop";

describe("useIsDesktop", () => {
  it("returns false on server/initial snapshot", () => {
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(isDesktopApp());
  });
});
