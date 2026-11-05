import { showsEstimatedReadyDate, type CalendarDate } from "@readyyet/shared";
import type { operations } from "@/lib/api/schema";

// Each tab of the list and what it asks the API for (ADR 0014, 0028, 0030).
export const VIEWS = {
  open: { state: "open" },
  ready: { status: ["READY"] },
  late: { overdue: "true" },
  collected: { state: "open", customerCollected: "true" },
  all: {},
} satisfies Record<string, NonNullable<operations["TicketController_list"]["parameters"]["query"]>>;

export type View = keyof typeof VIEWS;

const DEFAULT_VIEW: View = "open";

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

export function ticketsHref(locationId: string, { view, q, cursor }: { view: View; q?: string; cursor?: string }) {
  const params = new URLSearchParams();
  if (view !== DEFAULT_VIEW) params.set("view", view);
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/locations/${locationId}${query ? `?${query}` : ""}`;
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

// Short and day first, with the year only when it isn't this one. Calendar
// dates have no time zone, UTC only keeps them from shifting.
export function formatDay(date: CalendarDate, today: CalendarDate, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}
