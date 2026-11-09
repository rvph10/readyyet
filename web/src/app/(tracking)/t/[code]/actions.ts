"use server";

import type { FeedbackTag } from "@readyyet/shared";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";

// The page itself says what changed, there are no toasts here (ADR 0062). A
// refusal revalidates it too: the API only refuses because the Ticket has
// moved on or its link has ended, and the page then shows where it is now.
async function finish(code: string, result: Parameters<typeof actionResult>[0]): Promise<ActionResult> {
  const outcome = await actionResult(result);
  if (outcome.ok || outcome.code === "CONFLICT" || outcome.code === "NOT_FOUND") {
    // The layout's whole subtree, the review page is under the tracking page.
    revalidatePath(`/t/${code}`, "layout");
  }
  return outcome;
}

export async function markCollected(code: string) {
  const result = await (await api()).POST("/tracking/{code}/collected", { params: { path: { code } } });
  return finish(code, result);
}

export async function stopUpdates(code: string) {
  const result = await (await api()).POST("/tracking/{code}/stop-notifications", { params: { path: { code } } });
  return finish(code, result);
}

export interface Rating {
  stars: number;
  tags: FeedbackTag[];
}

// ADR 0125: saved by the Customer's own action, never by opening the page.
export async function sendFeedback(code: string, rating: Rating, message: string) {
  const result = await (
    await api()
  ).POST("/tracking/{code}/feedback", {
    params: { path: { code } },
    body: { ...rating, ...(message && { message }) },
  });
  return finish(code, result);
}

// Counted for the shop as the Customer leaves for Google. Not revalidated:
// the page they leave behind has nothing new to show.
export async function recordGoogleClick(code: string, rating: Rating) {
  const result = await (
    await api()
  ).POST("/tracking/{code}/google-click", { params: { path: { code } }, body: rating });
  return actionResult(result);
}
