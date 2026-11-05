"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";

// The page itself says what changed, there are no toasts here (ADR 0062). A
// refusal revalidates it too: the API only refuses because the Ticket has
// moved on, and the page then shows where it is now.
async function finish(code: string, result: Parameters<typeof actionResult>[0]): Promise<ActionResult> {
  const outcome = await actionResult(result);
  if (outcome.ok || outcome.code === "CONFLICT") {
    // The layout's whole subtree, the review page is under the tracking page.
    revalidatePath(`/t/${code}`, "layout");
  }
  return outcome;
}

export async function markCollected(code: string) {
  const result = await (await api()).POST("/tracking/{code}/collected", { params: { path: { code } } });
  return finish(code, result);
}

// Nothing on any page shows it, so nothing to revalidate.
export async function stopUpdates(code: string) {
  const result = await (await api()).POST("/tracking/{code}/stop-notifications", { params: { path: { code } } });
  return actionResult(result);
}

export async function sendFeedback(code: string, message: string) {
  const result = await (
    await api()
  ).POST("/tracking/{code}/feedback", {
    params: { path: { code } },
    body: { message },
  });
  return finish(code, result);
}
