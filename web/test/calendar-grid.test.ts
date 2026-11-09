import { describe, expect, it } from "vitest";
import { addDays, addMonths, monthWeeks, weekdayIndex } from "../src/lib/calendar-grid";

describe("addDays", () => {
  it("crosses months, years and a clock change", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });
});

describe("addMonths", () => {
  it("keeps the day, or the month's last when it's shorter", () => {
    expect(addMonths("2026-11-05", 1)).toBe("2026-12-05");
    expect(addMonths("2026-12-05", 1)).toBe("2027-01-05");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
});

describe("weekdayIndex", () => {
  it("starts the week on Monday", () => {
    expect(weekdayIndex("2026-11-02")).toBe(0);
    expect(weekdayIndex("2026-11-08")).toBe(6);
  });
});

describe("monthWeeks", () => {
  it("is always six full weeks from a Monday, holding the whole month", () => {
    for (const month of ["2026-11-15", "2026-02-15", "2027-02-15"]) {
      const weeks = monthWeeks(month);
      expect(weeks).toHaveLength(6);
      expect(weeks.every((week) => week.length === 7)).toBe(true);
      expect(weekdayIndex(weeks[0][0])).toBe(0);
      expect(weeks.flat()).toContain(`${month.slice(0, 7)}-01`);
    }
    expect(monthWeeks("2026-11-15")[0][0]).toBe("2026-10-26");
  });
});
