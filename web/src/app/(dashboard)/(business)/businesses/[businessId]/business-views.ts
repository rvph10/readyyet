import { PRICES } from "../../../locations/[locationId]/plan-prices";
import type { components } from "../../../../../lib/api/schema";

type Billing = components["schemas"]["BillingDto"];
type Counts = components["schemas"]["OverviewCountsDto"];

export interface BusinessLocation {
  id: string;
  name: string;
  billing: Billing;
  daysLeft: number | null;
  timeZone: string;
  counts: Counts | null;
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

// The API refuses Stripe's portal to a Business that never paid. An ended plan
// keeps its name, and its invoices are still wanted, where a Location that
// never had a plan has none.
export const hasPaid = (locations: BusinessLocation[]) =>
  locations.some(({ billing }) => billing.status !== "TRIAL" && billing.plan !== null);

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

// What stops a shop, or is about to: the only thing the Business's home raises.
export const stoppedCount = (locations: BusinessLocation[]) =>
  locations.filter(({ billing }) => ["paused", "failed"].includes(planState(billing))).length;

interface Team {
  location: { id: string; name: string };
  members: {
    role: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }[];
  open: { email: string; state: string }[];
}

export interface TeamPerson {
  user: Team["members"][number]["user"];
  owner: boolean;
  places: { id: string; name: string; role: string }[];
}

// Each person once, the Owner first, as they're at every Location by definition.
export function teamPeople(teams: Team[]) {
  const people = new Map<string, TeamPerson>();
  for (const { location, members } of teams) {
    for (const { role, user } of members) {
      const person = people.get(user.id) ?? { user, owner: false, places: [] };
      person.owner ||= role === "OWNER";
      person.places.push({ id: location.id, name: location.name, role });
      people.set(user.id, person);
    }
  }
  return [...people.values()].sort(
    (a, b) => Number(b.owner) - Number(a.owner) || a.user.name.localeCompare(b.user.name),
  );
}

// Only those still waiting for an answer. An expired one is dealt with on its
// Location's Team page.
export function teamInvitations(teams: Team[]) {
  const invitations = new Map<string, Team["location"][]>();
  for (const { location, open } of teams) {
    for (const { email, state } of open) {
      if (state !== "pending") continue;
      invitations.set(email, [...(invitations.get(email) ?? []), location]);
    }
  }
  return [...invitations].map(([email, places]) => ({ email, places }));
}
