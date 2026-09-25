// A calendar date as "YYYY-MM-DD", with no time and no time zone: what a
// shop promises and what a Postgres DATE holds (ADR 0030).
export type CalendarDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;
// Date's getUTCDay() order, as schema.org DayOfWeek names.
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The date it is at `instant` on a Location's clock. en-CA formats as
// YYYY-MM-DD.
export function calendarDateIn(instant: Date, timeZone: string): CalendarDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    instant,
  );
}

// The turnaroundDays-th open day after the drop-off date, the drop-off day
// itself not counted (ADR 0036). A day is open when the opening hours have
// a range on it, a Location without opening hours counts every day.
export function turnaroundReadyDate(input: {
  droppedOffAt: Date;
  turnaroundDays: number;
  timeZone: string;
  openingHours: readonly { dayOfWeek: string }[];
}): CalendarDate {
  const openDays = new Set(input.openingHours.map((range) => range.dayOfWeek));
  const isOpen = (day: Date) => openDays.size === 0 || openDays.has(WEEKDAYS[day.getUTCDay()]);

  // Midnight UTC of the local date, only ever used as a calendar date.
  let day = new Date(`${calendarDateIn(input.droppedOffAt, input.timeZone)}T00:00:00Z`);
  for (let counted = 0; counted < input.turnaroundDays;) {
    day = new Date(day.getTime() + DAY_MS);
    if (isOpen(day)) {
      counted++;
    }
  }
  return day.toISOString().slice(0, 10);
}
