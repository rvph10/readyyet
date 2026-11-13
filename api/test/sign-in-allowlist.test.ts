import { describe, expect, it } from "vitest";
import { isAllowedToSignIn } from "../src/auth/sign-in-allowlist";

// ADR 0150: only the listed addresses and domains sign in where it's set.
describe("Sign-in allowlist", () => {
  const list = " owner@shop.be, @team.test ";

  it("lets anyone in when unset or empty", () => {
    expect(isAllowedToSignIn("anyone@example.com", undefined)).toBe(true);
    expect(isAllowedToSignIn("anyone@example.com", "")).toBe(true);
  });

  it("lets in a listed address or anyone on a listed domain, whatever its case", () => {
    expect(isAllowedToSignIn("Owner@Shop.be", list)).toBe(true);
    expect(isAllowedToSignIn("someone@TEAM.test", list)).toBe(true);
  });

  it("refuses anyone else, a subdomain of a listed domain included", () => {
    expect(isAllowedToSignIn("other@shop.be", list)).toBe(false);
    expect(isAllowedToSignIn("someone@mail.team.test", list)).toBe(false);
  });
});
