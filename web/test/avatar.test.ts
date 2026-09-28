import { describe, expect, it } from "vitest";
import { avatarColor, initials } from "../src/components/ui/avatar";

describe("initials", () => {
  it("takes the first and last words", () => {
    expect(initials("Lucas Van den Berg")).toBe("LB");
  });

  it("gives one letter for a single name", () => {
    expect(initials("  sofia ")).toBe("S");
  });

  it("keeps accented and non-Latin letters", () => {
    expect(initials("émilie janssens")).toBe("ÉJ");
    expect(initials("𝒜da Lovelace")).toBe("𝒜L");
  });
});

describe("avatarColor", () => {
  it("gives the same colour for the same id", () => {
    expect(avatarColor("usr_42")).toBe(avatarColor("usr_42"));
  });

  it("spreads ids over the palette", () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => avatarColor(`usr_${i}`)));
    expect(seen.size).toBe(5);
  });
});
