import type { CalendarDate } from "@readyyet/shared";

const WEEKS = 6;
const WEEK_DAYS = 7;

// Calendar dates have no time zone, UTC only keeps them from shifting.
function utc(date: CalendarDate) {
  return new Date(`${date}T00:00:00Z`);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: CalendarDate, days: number) {
  const moved = utc(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return iso(moved);
}

// The same day of another month, or that month's last when it's shorter.
export function addMonths(date: CalendarDate, months: number) {
  const moved = utc(date);
  const day = moved.getUTCDate();
  moved.setUTCDate(1);
  moved.setUTCMonth(moved.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(moved.getUTCFullYear(), moved.getUTCMonth() + 1, 0)).getUTCDate();
  moved.setUTCDate(Math.min(day, lastDay));
  return iso(moved);
}

// 0 for a Monday, Belgian weeks start there.
export function weekdayIndex(date: CalendarDate) {
  return (utc(date).getUTCDay() + 6) % WEEK_DAYS;
}

// Always six weeks, so moving between months never changes the calendar's height.
export function monthWeeks(date: CalendarDate) {
  const first = `${date.slice(0, 7)}-01`;
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: WEEK_DAYS }, (_, day) => addDays(start, week * WEEK_DAYS + day)),
  );
}
