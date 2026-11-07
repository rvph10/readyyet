import { describe, expect, it } from "vitest";
import { safeNextPath } from "../src/lib/next-path";

describe("safeNextPath", () => {
  it("keeps a path on the web app, with its query", () => {
    expect(safeNextPath("/invitations/abc?x=1")).toBe("/invitations/abc?x=1");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["absolute URL", "https://evil.example/"],
    ["protocol-relative", "//evil.example/"],
    ["backslash", "/\\evil.example/"],
    ["relative", "locations"],
    ["javascript", "javascript:alert(1)"],
  ])("falls back to / for a %s value", (_, next) => {
    expect(safeNextPath(next)).toBe("/");
  });
});
