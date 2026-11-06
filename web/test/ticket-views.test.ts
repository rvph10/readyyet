import { describe, expect, it } from "vitest";
import {
  expected,
  formatDay,
  formatMoment,
  daysBetween,
  parseFilter,
  parseQuery,
  parseView,
  ticketsHref,
  waitTone,
} from "../src/app/(dashboard)/locations/[locationId]/tickets/ticket-views";

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
    expect(ticketsHref("loc", { view: "open" })).toBe("/locations/loc/tickets");
    expect(ticketsHref("loc", { view: "late", q: "a&b" })).toBe("/locations/loc/tickets?view=late&q=a%26b");
    expect(ticketsHref("loc", { view: "open", cursor: "c" })).toBe("/locations/loc/tickets?cursor=c");
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

describe("formatMoment", () => {
  const join = ({ day, time }: { day: string; time: string }) => `${day} at ${time}`;
  const at = (instant: string, locale = "en") =>
    formatMoment(new Date(instant), "Europe/Brussels", TODAY, locale, join);

  it("gives the time on the Location's clock, in the page's words", () => {
    expect(at("2026-11-03T13:05:00Z")).toBe("3 Nov at 14:05");
  });

  it("says today and yesterday", () => {
    expect(at("2026-11-05T13:05:00Z")).toBe("Today at 14:05");
    expect(at("2026-11-04T13:05:00Z")).toBe("Yesterday at 14:05");
    expect(at("2026-11-05T13:05:00Z", "fr")).toBe("Aujourd’hui at 14:05");
  });
});

describe("formatDay", () => {
  it("reads day first, with the year only when it isn't this one", () => {
    expect(formatDay("2026-11-03", TODAY, "en")).toBe("3 Nov");
    expect(formatDay("2025-12-31", TODAY, "en")).toBe("31 Dec 2025");
    expect(formatDay("2026-11-03", TODAY, "fr")).toBe("3 nov.");
  });
});

describe("parseFilter", () => {
  it("keeps a known filter and falls back to all on anything else", () => {
    expect(parseFilter("waiting")).toBe("waiting");
    expect(parseFilter("nope")).toBe("all");
    expect(parseFilter(["late"])).toBe("all");
  });
});

describe("daysBetween", () => {
  it("counts whole days, across a clock change too", () => {
    expect(daysBetween("2026-11-05", "2026-11-05")).toBe(0);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("waitTone", () => {
  it("follows the reminders at 3 and 10 days", () => {
    expect(waitTone(2)).toBe("text-ink");
    expect(waitTone(3)).toBe("text-warning");
    expect(waitTone(10)).toBe("text-danger");
  });
});
