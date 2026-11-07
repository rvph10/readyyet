import type { components } from "@/lib/api/schema";
import { addDays, weekdayIndex } from "../../../../../lib/calendar-grid";

export type OpeningHours = components["schemas"]["OpeningHoursSpecificationDto"];
export type Day = OpeningHours["dayOfWeek"];
export interface TimeRange {
  opens: string;
  closes: string;
}
export type Week = Record<Day, TimeRange[]>;

export const DAYS: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS: Day[] = ["Tuesday", "Wednesday", "Thursday", "Friday"];
export const DEFAULT_RANGE: TimeRange = { opens: "09:00", closes: "18:00" };
const MOST_RANGES = 2;
// 1 January 2024 was a Monday, which is all this date is for.
const A_MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export function weekFrom(hours: OpeningHours[]): Week {
  return Object.fromEntries(
    DAYS.map((day) => [
      day,
      hours.filter(({ dayOfWeek }) => dayOfWeek === day).map(({ opens, closes }) => ({ opens, closes })),
    ]),
  ) as Week;
}

export function hoursFrom(week: Week): OpeningHours[] {
  return DAYS.flatMap((dayOfWeek) => week[dayOfWeek].map((range) => ({ dayOfWeek, ...range })));
}

// ADR 0034's rule, the API's IsWeeklyOpeningHours: "HH:MM" compares in order.
export function dayIsValid(ranges: TimeRange[]) {
  return (
    ranges.length <= MOST_RANGES &&
    ranges.every(
      ({ opens, closes }, index) =>
        opens && closes && opens < closes && (index === 0 || ranges[index - 1].closes < opens),
    )
  );
}

// A break splits the day where most shops close for lunch. A day that doesn't
// fit around that fails dayIsValid and asks for its times.
export function withBreak([{ opens, closes }]: TimeRange[]): TimeRange[] {
  return [
    { opens, closes: "12:30" },
    { opens: "13:30", closes },
  ];
}

export function dayName(day: Day, locale: string) {
  const name = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    A_MONDAY + DAYS.indexOf(day) * DAY_MS,
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const SETTINGS_SECTIONS = ["shop", "hours", "tickets", "reviews", "delete"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function parseSection(value: unknown, sections: readonly SettingsSection[]): SettingsSection {
  return sections.find((section) => section === value) ?? "shop";
}

const LONGEST_PREVIEW_WEEKS = 6;

export type TurnaroundDay = { date: string; kind: "outside" | "today" | "counted" | "closed" | "ready" };

// The weeks from today to the ready date, Mondays first, as the calendar on the
// Tickets section draws them. A long turnaround keeps the weeks nearest its end.
export function turnaroundWeeks(
  today: string,
  ready: string,
  hours: readonly { dayOfWeek: string }[],
): TurnaroundDay[][] {
  const open = new Set(hours.map(({ dayOfWeek }) => dayOfWeek));
  const isOpen = (date: string) => open.size === 0 || open.has(DAYS[weekdayIndex(date)]);
  const kind = (date: string): TurnaroundDay["kind"] => {
    if (date === today) return "today";
    if (date === ready) return "ready";
    if (date < today || date > ready) return "outside";
    return isOpen(date) ? "counted" : "closed";
  };
  const weeks: TurnaroundDay[][] = [];
  for (let monday = addDays(today, -weekdayIndex(today)); monday <= ready; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, offset) => {
        const date = addDays(monday, offset);
        return { date, kind: kind(date) };
      }),
    );
  }
  return weeks.slice(-LONGEST_PREVIEW_WEEKS);
}
