import type { Prisma, Subscription } from "@readyyet/db";
import { LOW_RATING_MAX } from "@readyyet/shared";
import { hasPro } from "../billing/plans";

// ADR 0039 and 0125: a Pro Location sends the feedback email, whose stars lead
// to the review page, Google review link or not. Checked when used, a plan
// change applies at once.
export function asksForFeedback(location: { subscription: Subscription | null }) {
  return location.subscription !== null && hasPro(location.subscription);
}

// ADR 0131: the email asking for it, and the line announcing it, only when the
// shop chose to send it. The tracking page still offers it either way. Only
// for a Ticket created since it was turned on, as its drop-off email is what
// told the Customer (ADR 0139).
export function emailsForFeedback(
  location: { subscription: Subscription | null; feedbackEmailsSince: Date | null },
  ticketCreatedAt: Date,
) {
  return (
    location.feedbackEmailsSince !== null &&
    location.feedbackEmailsSince <= ticketCreatedAt &&
    asksForFeedback(location)
  );
}

// ADR 0125: what the sidebar, the bell and the staff email count.
export const NEEDS_FOLLOW_UP = {
  handledAt: null,
  OR: [{ message: { not: null } }, { stars: { lte: LOW_RATING_MAX } }],
} satisfies Prisma.TicketFeedbackWhereInput;

export function needsFollowUp(feedback: { handledAt: Date | null; message: string | null; stars: number | null }) {
  return (
    feedback.handledAt === null &&
    (feedback.message !== null || (feedback.stars !== null && feedback.stars <= LOW_RATING_MAX))
  );
}
