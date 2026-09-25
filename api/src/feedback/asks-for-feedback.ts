import type { Subscription } from "@readyyet/db";
import { hasPro } from "../billing/plans";

// ADR 0039: a Pro Location that set its Google review link sends the
// feedback email, and its completed Tickets' tracking pages offer both
// choices. Checked when used, a plan change applies at once.
export function asksForFeedback(location: { googleReviewUrl: string | null; subscription: Subscription | null }) {
  return location.googleReviewUrl !== null && location.subscription !== null && hasPro(location.subscription);
}
