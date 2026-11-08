import type { IllustrationName } from "@/components/illustration";
import type { components } from "@/lib/api/schema";

type Setup = components["schemas"]["InsightsSetupDto"];

// In the order a new shop should take them: what it's for first, then what
// Customers see, then the rest (ADR 0117).
const STEPS = [
  { key: "firstTicket", done: "firstTicket", illustration: "tag" },
  { key: "address", done: "address", illustration: "search" },
  { key: "hours", done: "openingHours", illustration: "clock" },
  { key: "turnaround", done: "turnaround", illustration: "hurry" },
  { key: "reviewLink", done: "reviewLink", illustration: "star" },
  { key: "team", done: "team", illustration: "helping" },
  { key: "logo", done: "logo", illustration: "images" },
  { key: "firstHandover", done: "firstHandover", illustration: "done" },
] as const satisfies readonly { key: string; done: keyof Setup; illustration: IllustrationName }[];

export type StepKey = (typeof STEPS)[number]["key"];

// The logo is the Business's, which only its Owner changes.
export function setupSteps(setup: Setup, owner: boolean) {
  return STEPS.filter(({ key }) => key !== "logo" || owner).map((step) => ({ ...step, isDone: setup[step.done] }));
}

// Read by the page too, so a folded guide is folded from the first paint.
export const foldedCookie = (locationId: string) => `setup-guide-folded-${locationId}`;
