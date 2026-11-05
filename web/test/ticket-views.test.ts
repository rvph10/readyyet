import { describe, expect, it } from "vitest";
import {
  expected,
  formatDay,
  parseQuery,
  parseView,
  ticketsHref,
} from "../src/app/(dashboard)/locations/[locationId]/(tickets)/ticket-views";

const TODAY = "2026-11-05";

describe("parseView", () => {
  it("keeps a known view and falls back to open on anything else", () => {
    expect(parseView("late")).toBe("late");
    expect(parseView("nope")).toBe("open");
    expect(parseView("constructor")).toBe("open");
    expect(parseView(["late", "ready"])).toBe("open");
    expect(parseView(undefined)).toBe("open");
  });
});

describe("parseQuery", () => {
  it("trims, and cuts what the API would refuse", () => {
    expect(parseQuery("  boots ")).toBe("boots");
    expect(parseQuery("x".repeat(150))).toHaveLength(100);
    expect(parseQuery(["a", "b"])).toBe("");
  });
});

describe("ticketsHref", () => {
  it("leaves the default view out and encodes the search", () => {
    expect(ticketsHref("loc", { view: "open" })).toBe("/locations/loc");
    expect(ticketsHref("loc", { view: "late", q: "a&b" })).toBe("/locations/loc?view=late&q=a%26b");
    expect(ticketsHref("loc", { view: "open", cursor: "c" })).toBe("/locations/loc?cursor=c");
  });
});

describe("expected", () => {
  it("names today and tomorrow, across a month's end too", () => {
    expect(expected(TODAY, "REPAIRING", TODAY)?.key).toBe("today");
    expect(expected("2026-11-06", "REPAIRING", TODAY)?.key).toBe("tomorrow");
    expect(expected("2026-12-01", "REPAIRING", "2026-11-30")?.key).toBe("tomorrow");
    expect(expected("2026-11-07", "REPAIRING", TODAY)?.key).toBe("on");
  });

  it("is late only from the day after", () => {
    expect(expected("2026-11-04", "REPAIRING", TODAY)?.key).toBe("late");
  });

  it("says nothing without a date, or once READY or ended", () => {
    expect(expected(null, "REPAIRING", TODAY)).toBeNull();
    expect(expected("2026-11-04", "READY", TODAY)).toBeNull();
    expect(expected("2026-11-04", "COMPLETED", TODAY)).toBeNull();
  });
});

describe("formatDay", () => {
  it("reads day first, with the year only when it isn't this one", () => {
    expect(formatDay("2026-11-03", TODAY, "en")).toBe("3 Nov");
    expect(formatDay("2025-12-31", TODAY, "en")).toBe("31 Dec 2025");
    expect(formatDay("2026-11-03", TODAY, "fr")).toBe("3 nov.");
  });
});
