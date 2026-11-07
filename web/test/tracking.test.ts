import { describe, expect, it } from "vitest";
import {
  isLowRating,
  journey,
  openingState,
  parseStars,
  readyDate,
  weekHours,
  type Tracking,
} from "../src/app/(tracking)/t/[code]/tracking";

function status(code: string) {
  return { code, translations: [{ locale: "EN" as const, label: code }] };
}

const WORKFLOW = ["RECEIVED", "DIAGNOSING", "REPAIRING", "READY", "COMPLETED", "CANCELLED", "REJECTED"];

function ticket(current: string, reached: string[]) {
  return {
    steps: WORKFLOW.map((code, index) => ({ position: index + 1, status: status(code) })),
    statusHistory: reached.map((code, index) => ({
      status: status(code),
      createdAt: `2026-11-0${index + 1}T10:00:00.000Z`,
    })),
    currentStatus: status(current),
  } as unknown as Pick<Tracking, "steps" | "statusHistory" | "currentStatus">;
}

const path = (data: ReturnType<typeof ticket>) => journey(data, "en", (iso) => iso.slice(0, 10));

describe("journey", () => {
  it("shows what's done and what's ahead, without the ways a Ticket can stop", () => {
    expect(path(ticket("DIAGNOSING", ["RECEIVED", "DIAGNOSING"]))).toEqual([
      { code: "RECEIVED", label: "RECEIVED", at: "2026-11-01" },
      { code: "DIAGNOSING", label: "DIAGNOSING", at: "2026-11-02" },
      { code: "REPAIRING", label: "REPAIRING", at: undefined },
      { code: "READY", label: "READY", at: undefined },
      { code: "COMPLETED", label: "COMPLETED", at: undefined },
    ]);
  });

  it("leaves out a step that was jumped over instead of drawing it as done", () => {
    const codes = path(ticket("REPAIRING", ["RECEIVED", "REPAIRING"])).map((step) => step.code);
    expect(codes).toEqual(["RECEIVED", "REPAIRING", "READY", "COMPLETED"]);
  });

  it("makes a step left behind by a move back upcoming again, with no date", () => {
    const steps = path(ticket("DIAGNOSING", ["RECEIVED", "DIAGNOSING", "REPAIRING", "DIAGNOSING"]));
    expect(steps.find((step) => step.code === "REPAIRING")?.at).toBeUndefined();
  });

  it("doesn't draw a step as done when a move back left it behind and the Ticket jumped past it", () => {
    const steps = path(ticket("REPAIRING", ["RECEIVED", "DIAGNOSING", "REPAIRING", "RECEIVED", "REPAIRING"]));
    expect(steps.map((step) => step.code)).toEqual(["RECEIVED", "REPAIRING", "READY", "COMPLETED"]);
  });

  it("dates a step reached twice with its latest time", () => {
    const steps = path(ticket("DIAGNOSING", ["RECEIVED", "DIAGNOSING", "REPAIRING", "DIAGNOSING"]));
    expect(steps.find((step) => step.code === "DIAGNOSING")?.at).toBe("2026-11-04");
  });

  it("ends a stopped Ticket at its stop, with nothing ahead", () => {
    const codes = path(ticket("CANCELLED", ["RECEIVED", "DIAGNOSING", "CANCELLED"])).map((step) => step.code);
    expect(codes).toEqual(["RECEIVED", "DIAGNOSING", "CANCELLED"]);
  });
});

describe("readyDate", () => {
  // 23:30 on the 4th in Brussels is already the 5th in UTC+2 and beyond, and
  // still the 4th on the Location's clock.
  const now = new Date("2026-11-04T22:30:00Z");

  it("counts days on the Location's clock", () => {
    expect(readyDate("2026-11-04", "Europe/Brussels", "en", now).key).toBe("expectedToday");
    expect(readyDate("2026-11-05", "Europe/Brussels", "en", now).key).toBe("expectedTomorrow");
  });

  it("writes other dates day first and says when one has passed", () => {
    expect(readyDate("2026-11-12", "Europe/Brussels", "en", now)).toEqual({
      key: "expectedOn",
      date: "Thursday 12 November",
    });
    expect(readyDate("2026-11-02", "Europe/Brussels", "fr", now)).toEqual({
      key: "expectedPast",
      date: "lundi 2 novembre",
    });
  });
});

describe("openingState", () => {
  const hours = [
    { dayOfWeek: "Wednesday", opens: "13:30", closes: "18:00" },
    { dayOfWeek: "Wednesday", opens: "09:00", closes: "12:30" },
    { dayOfWeek: "Friday", opens: "10:00", closes: "16:00" },
  ] as Tracking["location"]["openingHours"];
  // 4 November 2026 is a Wednesday, Brussels is UTC+1 then.
  const at = (time: string) => openingState(hours, "Europe/Brussels", "en", new Date(`2026-11-04T${time}:00+01:00`));

  it("says until when it's open, whichever range it's in", () => {
    expect(at("10:00")).toEqual({ key: "openUntil", time: "12:30" });
    expect(at("13:30")).toEqual({ key: "openUntil", time: "18:00" });
  });

  it("gives the time it reopens over lunch and before opening", () => {
    expect(at("08:00")).toEqual({ key: "opensAt", time: "09:00" });
    expect(at("12:30")).toEqual({ key: "opensAt", time: "13:30" });
  });

  it("names the next open day after closing", () => {
    expect(at("18:00")).toEqual({ key: "opensOn", day: "Friday", time: "10:00" });
  });

  it("reads the Location's clock, not the server's", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    expect(openingState(hours, "Europe/Brussels", "en", now)).toEqual({ key: "openUntil", time: "12:30" });
    expect(openingState(hours, "America/New_York", "en", now)).toEqual({ key: "opensAt", time: "09:00" });
  });

  it("says nothing without opening hours", () => {
    expect(openingState([], "Europe/Brussels", "en", new Date())).toBeNull();
  });
});

describe("weekHours", () => {
  it("lists the whole week from Monday with closed days empty and today marked", () => {
    const hours = [{ dayOfWeek: "Wednesday", opens: "09:00", closes: "12:30" }] as Tracking["location"]["openingHours"];
    const week = weekHours(hours, "Europe/Brussels", "fr", new Date("2026-11-04T10:00:00Z"));
    expect(week.map((day) => day.name)).toEqual([
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
    ]);
    expect(week[2]).toMatchObject({ isToday: true, ranges: hours });
    expect(week[0]).toMatchObject({ isToday: false, ranges: [] });
  });
});

describe("parseStars", () => {
  it("takes 1 to 5 and treats anything else as no rating yet", () => {
    expect(parseStars("1")).toBe(1);
    expect(parseStars("5")).toBe(5);
    for (const value of ["0", "6", "2.5", "abc", "", undefined, ["1", "2"]]) {
      expect(parseStars(value)).toBeUndefined();
    }
  });
});

describe("isLowRating", () => {
  it("is 1 to 3 stars", () => {
    expect([1, 2, 3, 4, 5].map(isLowRating)).toEqual([true, true, true, false, false]);
  });
});
