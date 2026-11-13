import type { PostHog } from "posthog-js";
import { isCustomerPage, POSTHOG_OPTIONS, readConsent } from "./consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let loading: Promise<PostHog> | undefined;

// One PostHog for the banner and the events, so an event sent while the page
// loads waits for it rather than being lost. Only once the visitor accepted,
// never on a Customer's page (ADR 0132).
export function loadPostHog(key: string) {
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, POSTHOG_OPTIONS);
    return posthog;
  });
  return loading;
}

// ADR 0136: the steps from sign-up to paying, to see where they stop.
export type ProductEvent = "signed_up" | "business_created" | "ticket_created" | "plan_chosen";

export function track(event: ProductEvent, properties?: Record<string, string>) {
  if (!POSTHOG_KEY || readConsent(document.cookie) !== "granted" || isCustomerPage(location.pathname)) return;
  void loadPostHog(POSTHOG_KEY).then((posthog) => posthog.capture(event, properties));
}
