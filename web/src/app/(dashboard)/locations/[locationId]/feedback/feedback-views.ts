import type { components } from "@/lib/api/schema";

// ADR 0125: what needs someone first, then every answer.
export const VIEWS = ["follow-up", "all"] as const;

export type View = (typeof VIEWS)[number];

export function parseView(value: unknown): View {
  return value === "all" ? "all" : "follow-up";
}

export function feedbackHref(locationId: string, { view, page }: { view: View; page?: number }) {
  const params = new URLSearchParams();
  if (view !== "follow-up") params.set("view", view);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/locations/${locationId}/feedback${query ? `?${query}` : ""}`;
}

// Whether new answers can arrive: the API's asksForFeedback, as the plan
// can't be read from the feedback itself.
export function asksForFeedback({ plan, frozen }: Pick<components["schemas"]["BillingDto"], "plan" | "frozen">) {
  return plan === "PRO" && !frozen;
}
