import { intlLocale } from "../locations/[locationId]/tickets/ticket-views";

// ReadyYet's own clock, as the back office has no Location to take one from.
const TIME_ZONE = "Europe/Brussels";

export const COMMISSION_VIEWS = ["OWED", "PENDING", "PAID", "VOIDED"] as const;
export type CommissionView = (typeof COMMISSION_VIEWS)[number];

export function parseCommissionView(value: unknown): CommissionView {
  return COMMISSION_VIEWS.find((view) => view === value) ?? "OWED";
}

export function partnerHref(userId: string, query: { view?: CommissionView; page?: number } = {}) {
  const search = new URLSearchParams();
  if (query.view && query.view !== "OWED") search.set("view", query.view);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const suffix = search.size > 0 ? `?${search}` : "";
  return `/admin/sales-partners/${userId}${suffix}`;
}

// The API counts in cents (ADR 0040).
export function formatCents(cents: number, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatDate(instant: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(instant));
}
