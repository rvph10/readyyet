import { Plan, SubscriptionStatus } from "@readyyet/db";

const TRIAL_DAYS = 14;

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
