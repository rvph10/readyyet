export type Plan = "PRO" | "ESSENTIEL";
export type Interval = "MONTH" | "YEAR";

export function parsePlan(value: unknown): Plan | null {
  return value === "PRO" || value === "ESSENTIEL" ? value : null;
}

// The API keeps a trial through Checkout with more than 48 hours left, and
// otherwise charges at once (MIN_CHECKOUT_TRIAL_MS). Days left round up, so 2
// or fewer is exactly that.
export const chargedAtTrialEnd = (daysLeft: number) => daysLeft > 2;

export const PLAN_NAMES: Record<Plan, string> = { PRO: "Pro", ESSENTIEL: "Essentiel" };

export const PLAN_FEATURES = {
  PRO: ["team", "workflow", "reviews"],
  ESSENTIEL: ["twoMembers", "defaultWorkflow"],
} as const;

// ADR 0031. No VAT is added: ReadyYet is under the franchise regime (ADR 0107).
export const PRICES: Record<Plan, Record<Interval, number>> = {
  PRO: { MONTH: 49, YEAR: 490 },
  ESSENTIEL: { MONTH: 29, YEAR: 290 },
};

// ADR 0040, what the referral coupons take off a first invoice.
export const REFERRAL_DISCOUNTS: Record<Plan, number> = { PRO: 24.5, ESSENTIEL: 14.5 };

const perMonth = (plan: Plan, interval: Interval) => PRICES[plan][interval] / (interval === "YEAR" ? 12 : 1);

// ADR 0033: a move that costs more per month starts at once, any other waits
// for the period to end.
export function startsAtOnce(from: { plan: Plan; interval: Interval }, to: { plan: Plan; interval: Interval }) {
  return perMonth(to.plan, to.interval) > perMonth(from.plan, from.interval);
}
