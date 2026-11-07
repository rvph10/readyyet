import { describe, expect, it } from "vitest";
import { customersHref, emailFails } from "../src/app/(dashboard)/locations/[locationId]/customers/customer-views";

describe("customersHref", () => {
  it("leaves what's empty out of the URL", () => {
    expect(customersHref("loc")).toBe("/locations/loc/customers");
    expect(customersHref("loc", { q: "" })).toBe("/locations/loc/customers");
  });

  it("escapes a search", () => {
    expect(customersHref("loc", { q: "Léa & co", page: 12 })).toBe(
      "/locations/loc/customers?q=L%C3%A9a+%26+co&page=12",
    );
  });
});

describe("emailFails", () => {
  it("counts a bounce and a spam report alike", () => {
    expect(emailFails({ emailBouncedAt: null, emailComplainedAt: null })).toBe(false);
    expect(emailFails({ emailBouncedAt: "2026-11-01T10:00:00Z", emailComplainedAt: null })).toBe(true);
    expect(emailFails({ emailBouncedAt: null, emailComplainedAt: "2026-11-01T10:00:00Z" })).toBe(true);
  });
});
