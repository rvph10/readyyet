import { describe, expect, it } from "vitest";
import { withoutQueryArguments } from "../src/instrument";

describe("withoutQueryArguments", () => {
  it("keeps which call failed and why, not the values it was called with", () => {
    const message = [
      "",
      "Invalid `prisma.customer.create()` invocation:",
      "",
      "{",
      "  data: {",
      '    fullName: "Jane Doe",',
      '    email: "jane@example.com",',
      "  }",
      "}",
      "",
      "Argument `location` is missing.",
    ].join("\n");

    expect(withoutQueryArguments(message)).toBe(
      "Invalid `prisma.customer.create()` invocation: Argument `location` is missing.",
    );
  });
});
