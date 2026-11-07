import { describe, expect, it } from "vitest";
import { formatPhone } from "../src/components/phone-number";

describe("formatPhone", () => {
  it("spaces a number out, and leaves what it can't read as it is", () => {
    expect(formatPhone("+32471318944")).toBe("+32 471 31 89 44");
    expect(formatPhone("not a number")).toBe("not a number");
  });
});
