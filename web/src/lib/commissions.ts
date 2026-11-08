import { intlLocale } from "@/app/(dashboard)/locations/[locationId]/tickets/ticket-views";

// ReadyYet's own clock, as these pages have no Location to take one from.
const TIME_ZONE = "Europe/Brussels";

export type CommissionState = "PENDING" | "OWED" | "PAID" | "VOIDED";

export const COMMISSION_PILLS: Record<CommissionState, string> = {
  OWED: "bg-brand text-ink",
  PENDING: "bg-subtle text-ink",
  PAID: "bg-pine text-surface",
  VOIDED: "bg-danger-subtle text-danger",
};

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
