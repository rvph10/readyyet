import { calendarDateIn, showsEstimatedReadyDate, type CalendarDate } from "@readyyet/shared";
import type { operations } from "@/lib/api/schema";
import { setSort, type Sort } from "../../../../../lib/sort";

// Each tab of the list and what it asks the API for (ADR 0014, 0028, 0030).
export const VIEWS = {
  open: { state: "open" },
  ready: { status: ["READY"] },
  late: { overdue: "true" },
  collected: { state: "open", customerCollected: "true" },
  all: {},
} satisfies Record<string, NonNullable<operations["TicketController_list"]["parameters"]["query"]>>;

export type View = keyof typeof VIEWS;

// Today's table, filtered on the page as it holds every open Ticket already.
const FILTERS = ["all", "late", "ready", "received", "working", "waiting"] as const;
export type Filter = (typeof FILTERS)[number];

export function parseFilter(value: unknown): Filter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

const DEFAULT_VIEW: View = "open";
const DAY_MS = 24 * 60 * 60 * 1000;

// The API refuses a longer search, and the URL can be edited.
const MAX_QUERY = 100;

function isView(value: unknown): value is View {
  return typeof value === "string" && Object.hasOwn(VIEWS, value);
}

export function parseView(value: unknown): View {
  return isView(value) ? value : DEFAULT_VIEW;
}

export function parseQuery(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_QUERY) : "";
}

export const LIST_SORTS = ["number", "customer", "title", "status", "expected", "received"] as const;
export const QUEUE_SORTS = ["customer", "status", "expected"] as const;
export type ListSort = (typeof LIST_SORTS)[number];
export type QueueSort = (typeof QUEUE_SORTS)[number];

export function ticketsHref(
  locationId: string,
  { view, q, page, sort }: { view: View; q?: string; page?: number; sort?: Sort<ListSort> | null },
) {
  const params = new URLSearchParams();
  if (view !== DEFAULT_VIEW) params.set("view", view);
  if (q) params.set("q", q);
  setSort(params, sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/locations/${locationId}/tickets${query ? `?${query}` : ""}`;
}

export type Expected = { key: "today" | "tomorrow" | "on" | "late"; date: CalendarDate };

function nextDay(date: CalendarDate) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

// Null once the date says nothing the Status doesn't. "late" is the API's
// overdue filter: `today` is on the Location's clock (ADR 0030).
export function expected(date: CalendarDate | null, statusCode: string, today: CalendarDate): Expected | null {
  if (!date || !showsEstimatedReadyDate(statusCode)) return null;
  if (date < today) return { key: "late", date };
  if (date === today) return { key: "today", date };
  return { key: date === nextDay(today) ? "tomorrow" : "on", date };
}

export function intlLocale(locale: string) {
  return locale === "en" ? "en-GB" : locale;
}

// Short and day first, with the year only when it isn't this one. Calendar
// dates have no time zone, UTC only keeps them from shifting.
export function formatDay(date: CalendarDate, today: CalendarDate, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

// Whole days from one calendar date to a later one.
export function daysBetween(from: CalendarDate, to: CalendarDate) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

// How worrying a wait to be collected is: the reminders go at 3 and 10 days
// (ADR 0028).
export const LONG_WAIT_DAYS = 10;
const SOME_WAIT_DAYS = 3;

export function waitTone(days: number) {
  if (days >= LONG_WAIT_DAYS) return "text-danger";
  return days >= SOME_WAIT_DAYS ? "text-warning" : "text-ink";
}

// The day as above, or today or yesterday, joined to the time on the Location's
// clock by the page's own words.
export function formatMoment(
  instant: Date,
  timeZone: string,
  today: CalendarDate,
  locale: string,
  join: (parts: { day: string; time: string }) => string,
) {
  const date = calendarDateIn(instant, timeZone);
  const ago = daysBetween(date, today);
  const relative = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(-ago, "day");
  const day =
    ago === 0 || ago === 1 ? relative.charAt(0).toUpperCase() + relative.slice(1) : formatDay(date, today, locale);
  const time = new Intl.DateTimeFormat(intlLocale(locale), { timeZone, timeStyle: "short", hourCycle: "h23" });
  return join({ day, time: time.format(instant) });
}
