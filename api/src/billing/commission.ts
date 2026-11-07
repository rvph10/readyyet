import type { Prisma } from "@readyyet/db";
import type Stripe from "stripe";

// ADR 0032.
export const COMMISSION_RATE = 0.35;
const COMMISSION_MONTHS = 6;
// A refund or dispute this soon after the invoice was paid voids its
// commission and sponsor credit, later they're owed whatever happens
// (ADR 0040).
export const REWARD_HOLD_MS = 14 * 24 * 60 * 60 * 1000;

// Where the service an invoice pays for starts, in seconds.
export function periodStart(invoice: Stripe.Invoice) {
  return Math.min(...invoice.lines.data.map((line) => line.period.start));
}

export function commissionWindowEnd(paidFrom: Date) {
  const end = new Date(paidFrom);
  end.setUTCMonth(end.getUTCMonth() + COMMISSION_MONTHS);
  return end;
}

// The part of the invoice's period inside the window: all of a monthly
// invoice or none, a yearly one's months inside, a proration's days inside.
export function shareWithin(invoice: Stripe.Invoice, from: Date, to: Date) {
  const start = periodStart(invoice);
  const end = Math.max(...invoice.lines.data.map((line) => line.period.end));
  const windowStart = from.getTime() / 1000;
  const windowEnd = to.getTime() / 1000;
  if (end <= start) {
    return start >= windowStart && start < windowEnd ? 1 : 0;
  }
  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart)) / (end - start);
}

// What the card was charged, VAT excluded (ADR 0040).
export function chargedExcludingTax(invoice: Stripe.Invoice) {
  const taxes = (invoice.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0);
  return invoice.amount_paid - taxes;
}

export const COMMISSION_STATES = ["PENDING", "OWED", "PAID", "VOIDED"] as const;
export type CommissionState = (typeof COMMISSION_STATES)[number];

// Computed from the dates, never stored: no job has to run for a
// commission to become owed (ADR 0040).
export function commissionState(
  commission: { invoicePaidAt: Date; voidedAt: Date | null; paidAt: Date | null },
  now = new Date(),
): CommissionState {
  if (commission.voidedAt) {
    return "VOIDED";
  }
  if (commission.paidAt) {
    return "PAID";
  }
  return now.getTime() - commission.invoicePaidAt.getTime() >= REWARD_HOLD_MS ? "OWED" : "PENDING";
}

export function commissionStateWhere(state: CommissionState, now = new Date()): Prisma.CommissionWhereInput {
  const heldUntil = new Date(now.getTime() - REWARD_HOLD_MS);
  switch (state) {
    case "VOIDED":
      return { voidedAt: { not: null } };
    case "PAID":
      return { voidedAt: null, paidAt: { not: null } };
    case "OWED":
      return { voidedAt: null, paidAt: null, invoicePaidAt: { lte: heldUntil } };
    case "PENDING":
      return { voidedAt: null, paidAt: null, invoicePaidAt: { gt: heldUntil } };
  }
}
