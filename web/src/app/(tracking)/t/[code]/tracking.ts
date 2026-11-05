import { calendarDateIn } from "@readyyet/shared";
import type { WorkflowStep } from "@/components/workflow-steps";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "../../../../lib/status-label";

export type Tracking = components["schemas"]["TrackingDto"];
type OpeningHours = Tracking["location"]["openingHours"];

const STOPPED = ["CANCELLED", "REJECTED"];

function isStopped(code: string) {
  return STOPPED.includes(code);
}

export const STARS = [1, 2, 3, 4, 5];

// From a link anyone can edit, so anything else means no rating yet.
export function parseStars(value: string | string[] | undefined) {
  return STARS.find((star) => String(star) === value);
}

export function isLowRating(stars: number) {
  return stars <= 3;
}

// Dates read day first and times on a 24-hour clock in both languages, as
// on a Belgian or French shop's door, not the American order "en" implies.
function intlLocale(locale: string) {
  return locale === "en" ? "en-GB" : locale;
}

// A moment on the Location's clock, since that's the clock the Customer
// will meet at the counter.
export function momentFormatter(timeZone: string, locale: string, now: Date, todayAt: (time: string) => string) {
  const time = new Intl.DateTimeFormat(intlLocale(locale), { timeZone, timeStyle: "short", hourCycle: "h23" });
  const full = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const today = calendarDateIn(now, timeZone);
  return (iso: string) => {
    const moment = new Date(iso);
    return calendarDateIn(moment, timeZone) === today ? todayAt(time.format(moment)) : full.format(moment);
  };
}

// The path the Customer sees, in Workflow order (ADR 0016 lets a Ticket move
// freely). A step passed without being reached is left out rather than drawn
// as done, a step left behind by a move back is upcoming again, and CANCELLED
// and REJECTED, which are steps of every Workflow, only show once they
// happened. A stopped Ticket has no way forward, so nothing is upcoming.
export function journey(
  { steps, statusHistory, currentStatus }: Pick<Tracking, "steps" | "statusHistory" | "currentStatus">,
  locale: string,
  formatMoment: (iso: string) => string,
): WorkflowStep[] {
  const reachedAt = new Map(statusHistory.map((event) => [event.status.code, String(event.createdAt)]));
  const currentCode = currentStatus.code;
  const currentPosition = steps.find((step) => step.status.code === currentCode)!.position;
  const stopped = isStopped(currentCode);

  return [...steps]
    .sort((a, b) => a.position - b.position)
    .filter(({ position, status: { code } }) => {
      if (code === currentCode) return true;
      if (isStopped(code)) return false;
      return position < currentPosition ? reachedAt.has(code) : !stopped;
    })
    .map(({ position, status }) => {
      const at = position <= currentPosition ? reachedAt.get(status.code) : undefined;
      return { code: status.code, label: statusLabel(status, locale), at: at && formatMoment(at) };
    });
}

export type ReadyDate =
  { key: "expectedToday" | "expectedTomorrow" } | { key: "expectedOn" | "expectedPast"; date: string };

export function readyDate(date: string, timeZone: string, locale: string, now: Date): ReadyDate {
  const midnight = (calendarDate: string) => new Date(`${calendarDate}T00:00:00Z`).getTime();
  const days = (midnight(date) - midnight(calendarDateIn(now, timeZone))) / (24 * 60 * 60 * 1000);
  if (days === 0) return { key: "expectedToday" };
  if (days === 1) return { key: "expectedTomorrow" };
  // Calendar dates have no time zone, UTC only keeps them from shifting.
  const formatted = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
  return { key: days < 0 ? "expectedPast" : "expectedOn", date: formatted };
}

// Monday first, like the week on a shop's door.
const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function onTheClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
  return { day: part("weekday"), time: `${part("hour")}:${part("minute")}` };
}

function rangesOn(hours: OpeningHours, day: string) {
  return hours.filter((range) => range.dayOfWeek === day).sort((a, b) => a.opens.localeCompare(b.opens));
}

function weekdayName(day: string, locale: string) {
  // 1 January 2024 was a Monday.
  const date = new Date(Date.UTC(2024, 0, 1 + WEEK.indexOf(day as (typeof WEEK)[number])));
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: "long" }).format(date);
}

export type OpeningState =
  { key: "openUntil"; time: string } | { key: "opensAt"; time: string } | { key: "opensOn"; day: string; time: string };

// Wall-clock strings compare correctly as text (ADR 0034). Null without any
// opening hours, when the page says nothing about them. Exceptional closures
// aren't recorded (ADR 0029), so this describes a regular week.
export function openingState(hours: OpeningHours, timeZone: string, locale: string, now: Date): OpeningState | null {
  if (hours.length === 0) return null;
  const { day, time } = onTheClock(now, timeZone);
  const today = rangesOn(hours, day);
  const current = today.find((range) => range.opens <= time && time < range.closes);
  if (current) return { key: "openUntil", time: current.closes };
  const later = today.find((range) => time < range.opens);
  if (later) return { key: "opensAt", time: later.opens };

  const todayIndex = WEEK.indexOf(day as (typeof WEEK)[number]);
  for (let ahead = 1; ahead <= 7; ahead++) {
    const next = WEEK[(todayIndex + ahead) % 7];
    const [first] = rangesOn(hours, next);
    if (first) return { key: "opensOn", day: weekdayName(next, locale), time: first.opens };
  }
  return null;
}

export function weekHours(hours: OpeningHours, timeZone: string, locale: string, now: Date) {
  const { day: today } = onTheClock(now, timeZone);
  return WEEK.map((day) => ({
    name: weekdayName(day, locale),
    isToday: day === today,
    ranges: rangesOn(hours, day),
  }));
}
