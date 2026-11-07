import type { components } from "@/lib/api/schema";

export const VIEWS = { waiting: "false", handled: "true" } as const;

export type View = keyof typeof VIEWS;

export function parseView(value: unknown): View {
  return value === "handled" ? "handled" : "waiting";
}

export function feedbackHref(locationId: string, { view, page }: { view: View; page?: number }) {
  const params = new URLSearchParams();
  if (view !== "waiting") params.set("view", view);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/locations/${locationId}/feedback${query ? `?${query}` : ""}`;
}

// Why no new feedback can arrive, null when it can. The API's asksForFeedback,
// as neither the plan nor the link can be read from the feedback itself.
export function feedbackBlock(
  { googleReviewUrl }: Pick<components["schemas"]["LocationDto"], "googleReviewUrl">,
  { plan, frozen }: Pick<components["schemas"]["BillingDto"], "plan" | "frozen">,
) {
  if (plan !== "PRO" || frozen) return "plan";
  return googleReviewUrl === null ? "reviewLink" : null;
}
