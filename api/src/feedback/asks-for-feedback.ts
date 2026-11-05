import type { Subscription } from "@readyyet/db";
import { hasPro } from "../billing/plans";

// ADR 0039 and 0076: a Pro Location that set its Google review link sends the
// feedback email, whose stars lead to the review page. Checked when used, a
// plan change applies at once.
export function asksForFeedback(location: { googleReviewUrl: string | null; subscription: Subscription | null }) {
  return location.googleReviewUrl !== null && location.subscription !== null && hasPro(location.subscription);
}
