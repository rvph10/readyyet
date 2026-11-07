import { describe, expect, it } from "vitest";
import { calendarDateIn, turnaroundReadyDate } from "@readyyet/shared";

const weekdays = (...days: string[]) => days.map((dayOfWeek) => ({ dayOfWeek, opens: "09:00", closes: "18:00" }));
// Tuesday to Saturday, closed Sunday and Monday.
const tuesdayToSaturday = weekdays("Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");

describe("turnaroundReadyDate", () => {
  it("skips the days the Location is closed", () => {
    // Friday 2026-09-25, 10:00 in Brussels.
    const date = turnaroundReadyDate({
      droppedOffAt: new Date("2026-09-25T08:00:00Z"),
      turnaroundDays: 2,
      timeZone: "Europe/Brussels",
      openingHours: tuesdayToSaturday,
    });

    // Saturday, then Tuesday: Sunday and Monday are closed.
    expect(date).toBe("2026-09-29");
  });

  it("counts every day when the Location has no opening hours", () => {
    const date = turnaroundReadyDate({
      droppedOffAt: new Date("2026-09-25T08:00:00Z"),
      turnaroundDays: 2,
      timeZone: "Europe/Brussels",
      openingHours: [],
    });

    expect(date).toBe("2026-09-27");
  });

  it("starts counting after a drop-off on a closed day", () => {
    // Sunday 2026-09-27.
    const date = turnaroundReadyDate({
      droppedOffAt: new Date("2026-09-27T10:00:00Z"),
      turnaroundDays: 1,
      timeZone: "Europe/Brussels",
      openingHours: tuesdayToSaturday,
    });

    expect(date).toBe("2026-09-29");
  });

  it("uses the drop-off date on the Location's clock, not UTC's", () => {
    // Still Friday in UTC, already Saturday 00:30 in Brussels.
    const date = turnaroundReadyDate({
      droppedOffAt: new Date("2026-09-25T22:30:00Z"),
      turnaroundDays: 1,
      timeZone: "Europe/Brussels",
      openingHours: tuesdayToSaturday,
    });

    expect(date).toBe("2026-09-29");
  });

  it("crosses a daylight saving change without drifting a day", () => {
    // Brussels leaves summer time on Sunday 2026-10-25.
    const date = turnaroundReadyDate({
      droppedOffAt: new Date("2026-10-23T08:00:00Z"),
      turnaroundDays: 7,
      timeZone: "Europe/Brussels",
      openingHours: [],
    });

    expect(date).toBe("2026-10-30");
  });
});

describe("calendarDateIn", () => {
  it("gives the date on the Location's clock", () => {
    expect(calendarDateIn(new Date("2026-09-25T22:30:00Z"), "Europe/Brussels")).toBe("2026-09-26");
    expect(calendarDateIn(new Date("2026-09-25T22:30:00Z"), "America/New_York")).toBe("2026-09-25");
  });
});
