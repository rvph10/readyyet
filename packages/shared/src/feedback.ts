// ADR 0125: what a Customer can tick on the review page, the same list for
// every rating. Never free text, so tags can be shown in public one day.
export const FEEDBACK_TAGS = [
  "ON_TIME",
  "FRIENDLY",
  "GOOD_VALUE",
  "CLEAR",
  "QUALITY",
  "LATE",
  "PRICE",
  "NOT_FIXED",
  "HARD_TO_REACH",
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

// What went well first on the page, then what didn't.
export const NEGATIVE_FEEDBACK_TAGS: readonly FeedbackTag[] = ["LATE", "PRICE", "NOT_FIXED", "HARD_TO_REACH"];

// A rating at or under this needs a follow-up even without a message.
export const LOW_RATING_MAX = 2;
