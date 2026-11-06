"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

const SEARCH_RESULTS = 5;

// Only a shortcut to a Ticket: without an answer, the Tickets page still searches.
export async function searchTickets(locationId: string, q: string) {
  const { data } = await (
    await api()
  ).GET("/locations/{locationId}/tickets", {
    params: { path: { locationId }, query: { q, take: SEARCH_RESULTS } },
  });
  return data?.items ?? [];
}

export async function markFeedbackHandled(locationId: string, feedbackId: string) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/feedback/{feedbackId}/handled", {
    params: { path: { locationId, feedbackId } },
  });
  revalidatePath(`/locations/${locationId}`, "layout");
  return actionResult(result);
}

export async function startCheckout(
  locationId: string,
  plan: components["schemas"]["CheckoutDto"],
): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/billing/checkout", { params: { path: { locationId } }, body: plan });
  if (result.data) {
    redirect(result.data.url);
  }
  return actionResult(result);
}
