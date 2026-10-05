import { describe, expect, it } from "vitest";
import { characterCount, validityMessage } from "../src/components/ui/field";

function input(problems: Partial<ValidityState>) {
  return { validity: problems } as HTMLInputElement;
}

const messages = { valueMissing: "Enter your email address.", typeMismatch: "Not an email address." };

describe("validityMessage", () => {
  it("is null for a valid input", () => {
    expect(validityMessage(input({}), messages)).toBeNull();
  });

  it("gives the message of the input's problem", () => {
    expect(validityMessage(input({ typeMismatch: true }), messages)).toBe("Not an email address.");
  });

  it("gives the first problem in the order of the messages", () => {
    expect(validityMessage(input({ typeMismatch: true, valueMissing: true }), messages)).toBe(
      "Enter your email address.",
    );
  });

  it("ignores a problem it has no message for", () => {
    expect(validityMessage(input({ patternMismatch: true }), messages)).toBeNull();
  });
});

describe("characterCount", () => {
  it("is null until the value reaches 80% of its limit", () => {
    expect(characterCount("a".repeat(79), 100)).toBeNull();
    expect(characterCount("a".repeat(80), 100)).toBe("80/100");
  });

  it("is null without a limit or a controlled value", () => {
    expect(characterCount("a".repeat(500), undefined)).toBeNull();
    expect(characterCount(undefined, 100)).toBeNull();
  });
});
