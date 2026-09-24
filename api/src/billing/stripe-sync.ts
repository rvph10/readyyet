import { SubscriptionStatus } from "@readyyet/db";
import type Stripe from "stripe";
import { fromLookupKey } from "./plans";

// incomplete is left out: a Checkout subscription waiting on its first
// payment (3D Secure) changes nothing for the Location yet.
const STATUS: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
  active: SubscriptionStatus.ACTIVE,
  // Only when the Location chose a plan during our trial, it's paid for.
  trialing: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  unpaid: SubscriptionStatus.ENDED,
  paused: SubscriptionStatus.ENDED,
  canceled: SubscriptionStatus.ENDED,
  incomplete_expired: SubscriptionStatus.ENDED,
};

// The Location's row as Stripe sees it now, null when there's nothing to
// write. `schedule` must be expanded.
export function toSubscriptionRow(subscription: Stripe.Subscription) {
  const status = STATUS[subscription.status];
  if (!status) {
    return null;
  }
  const item = subscription.items.data[0];
  const schedule = subscription.schedule as Stripe.SubscriptionSchedule | null;
  // Set by BillingService when it schedules a move to a cheaper price.
  const next = schedule?.phases.find((phase) => phase.start_date >= item.current_period_end)?.metadata?.lookupKey;
  const scheduled = next ? fromLookupKey(next) : null;

  return {
    status,
    ...fromLookupKey(item.price.lookup_key),
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    scheduledPlan: scheduled?.plan ?? null,
    scheduledInterval: scheduled?.interval ?? null,
  };
}
