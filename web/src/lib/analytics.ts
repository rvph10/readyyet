import { readConsent } from "./consent";

// ADR 0136: the steps a sign-up goes through, to see where shops drop off.
export type ProductEvent = "signed_up" | "business_created" | "ticket_created" | "plan_chosen";

// PostHog only runs after "Accept" and never on a Customer's page (ADR 0132),
// so without it the event is simply dropped, and nothing loads before consent.
export function track(event: ProductEvent, properties?: Record<string, string>) {
  if (readConsent(document.cookie) !== "granted") return;
  void import("posthog-js").then(({ default: posthog }) => {
    if (posthog.__loaded) posthog.capture(event, properties);
  });
}
