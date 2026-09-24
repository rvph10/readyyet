import { Plan, SubscriptionStatus, type Subscription } from "@readyyet/db";

const TRIAL_DAYS = 14;
const ESSENTIEL_MEMBER_LIMIT = 2;

// ADR 0031: a Business's first Location gets the trial, and since a
// Business is created with its first Location, every later one starts
// without, deleting and recreating a Location can't restart it.
export function trialSubscription(now = new Date()) {
  return {
    status: SubscriptionStatus.TRIAL,
    plan: Plan.PRO,
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
  };
}

export const UNPAID_SUBSCRIPTION = { status: SubscriptionStatus.ENDED };

// Computed, never stored (ADR 0033): no job has to run for a trial to end.
export function isFrozen(subscription: Subscription, now = new Date()) {
  if (subscription.status === SubscriptionStatus.TRIAL) {
    return subscription.trialEndsAt! <= now;
  }
  return subscription.status === SubscriptionStatus.ENDED;
}

// A move to Essentiel waiting for the period to end already holds the
// Location to its limit, or it could grow past it before the switch.
export function memberLimit(subscription: Subscription) {
  const essentiel = subscription.plan === Plan.ESSENTIEL || subscription.scheduledPlan === Plan.ESSENTIEL;
  return essentiel ? ESSENTIEL_MEMBER_LIMIT : null;
}
