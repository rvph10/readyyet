import type Stripe from "stripe";

// ADR 0032.
export const COMMISSION_RATE = 0.35;
const COMMISSION_MONTHS = 6;
// A refund or dispute this soon after the invoice was paid voids its
// commission, later it's owed whatever happens (ADR 0040).
export const COMMISSION_HOLD_MS = 14 * 24 * 60 * 60 * 1000;

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
