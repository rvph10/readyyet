import { perMonth, PRICES } from "../../../locations/[locationId]/plan-prices";
import { isUrgentTrial } from "../../../locations/[locationId]/trial-meter";
import type { components } from "../../../../../lib/api/schema";

type Billing = components["schemas"]["BillingDto"];
type Counts = components["schemas"]["OverviewCountsDto"];
type HandedOver = components["schemas"]["OverviewHandedOverDto"];

export interface BusinessLocation {
  id: string;
  name: string;
  billing: Billing;
  daysLeft: number | null;
  timeZone: string;
  counts: Counts | null;
  handedOver: HandedOver | null;
}

export type PlanState = "paused" | "failed" | "trial" | "stopping" | "changing" | "active";

// The one thing to say about a Location's plan, the worst first.
export function planState(billing: Billing): PlanState {
  if (billing.frozen) return "paused";
  if (billing.status === "PAST_DUE") return "failed";
  if (billing.status === "TRIAL") return "trial";
  if (billing.cancelAtPeriodEnd) return "stopping";
  if (billing.scheduledPlan) return "changing";
  return "active";
}

const isPaying = ({ status }: Billing) => status === "ACTIVE" || status === "PAST_DUE";

export const payingCount = (locations: BusinessLocation[]) =>
  locations.filter(({ billing }) => isPaying(billing)).length;

// The API refuses Stripe's portal to a Business that never paid. An ended plan
// keeps its name, and its invoices are still wanted, where a Location that
// never had a plan has none.
export const hasPaid = (locations: BusinessLocation[]) =>
  locations.some(({ billing }) => billing.status !== "TRIAL" && billing.plan !== null);

// List prices: BillingDto has no invoice amounts, so a discount isn't in here.
// A yearly plan counts for a twelfth, and one that's stopping still counts
// until it stops.
export function monthlyCost(locations: BusinessLocation[]) {
  return locations.reduce(
    (total, { billing }) =>
      isPaying(billing) && billing.plan && billing.interval ? total + perMonth(billing.plan, billing.interval) : total,
    0,
  );
}

export function nextPayment(locations: BusinessLocation[]) {
  const [next] = locations
    // A failed payment is Stripe's to retry, on no date we know.
    .filter(({ billing }) => billing.status === "ACTIVE" && !billing.cancelAtPeriodEnd && billing.currentPeriodEnd)
    .sort((a, b) => a.billing.currentPeriodEnd!.localeCompare(b.billing.currentPeriodEnd!));
  if (!next) return null;
  const { billing } = next;
  return {
    location: next,
    date: billing.currentPeriodEnd!,
    amount: PRICES[billing.scheduledPlan ?? billing.plan!][billing.scheduledInterval ?? billing.interval!],
  };
}

// Whole euros stay whole, a yearly plan's twelfth keeps its cents.
export const moneyOptions = (amount: number) =>
  ({ style: "currency", currency: "EUR", maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }) as const;

export function sumCounts(locations: BusinessLocation[], key: "open" | "ready" | "late") {
  const known = locations.flatMap(({ counts }) => (counts ? [counts[key]] : []));
  return known.length > 0 ? known.reduce((total, count) => total + count, 0) : null;
}

export function busiest(locations: BusinessLocation[], key: "open" | "ready" | "late") {
  const [top] = locations.filter(({ counts }) => counts?.[key]).sort((a, b) => b.counts![key] - a.counts![key]);
  return top?.name ?? null;
}

// Every Location's last 7 days, today last. Locations in other time zones can
// be a day apart around midnight, which a week's picture doesn't feel.
export function weekTotals(locations: BusinessLocation[]) {
  const weeks = locations.flatMap(({ handedOver }) => handedOver ?? []);
  if (weeks.length === 0) return null;
  return {
    days: weeks[0].days.map(({ date }, index) => ({
      date,
      count: weeks.reduce((total, { days }) => total + days[index].count, 0),
    })),
    previousWeek: weeks.reduce((total, { previousWeek }) => total + previousWeek, 0),
  };
}

// One mark per Location, the plans first, as a chain reads its mix at a glance.
// A trial isn't a plan yet, and a stopped Location no longer has one.
export function planMix(locations: BusinessLocation[]) {
  const group = ({ billing }: BusinessLocation) =>
    isPaying(billing) && billing.plan ? billing.plan : ("NONE" as const);
  const order = ["PRO", "ESSENTIEL", "NONE"] as const;
  return order.flatMap((key) => {
    const members = locations.filter((location) => group(location) === key);
    return members.length > 0 ? [{ key, members }] : [];
  });
}

export type Attention =
  | { kind: "paused" | "failed"; location: BusinessLocation }
  | { kind: "trial" | "late" | "feedback"; location: BusinessLocation; count: number };

// What an Owner should open first: money that stops the shop, then customers
// waiting, then what can wait a day.
export function attentionItems(locations: BusinessLocation[]): Attention[] {
  const pick = (test: (location: BusinessLocation) => Attention | null) =>
    locations.flatMap((location) => test(location) ?? []);
  return [
    ...pick((location) => (planState(location.billing) === "paused" ? { kind: "paused", location } : null)),
    ...pick((location) => (planState(location.billing) === "failed" ? { kind: "failed", location } : null)),
    ...pick((location) =>
      location.daysLeft !== null && location.daysLeft > 0 && isUrgentTrial(location.daysLeft)
        ? { kind: "trial", location, count: location.daysLeft }
        : null,
    ),
    ...pick((location) => (location.counts?.late ? { kind: "late", location, count: location.counts.late } : null)),
    ...pick((location) =>
      location.counts?.unhandledFeedback
        ? { kind: "feedback", location, count: location.counts.unhandledFeedback }
        : null,
    ),
  ];
}

export function attentionHref({ kind, location }: Attention) {
  const base = `/locations/${location.id}`;
  if (kind === "late") return `${base}/tickets`;
  if (kind === "feedback") return `${base}/feedback`;
  return `${base}/billing`;
}
