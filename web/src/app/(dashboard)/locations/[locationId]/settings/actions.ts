"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

const path = (locationId: string) => ({ params: { path: { locationId } } });

export async function updateLocation(locationId: string, changes: components["schemas"]["UpdateLocationDto"]) {
  const result = await (await api()).PATCH("/locations/{locationId}", { ...path(locationId), body: changes });
  // The whole Location: its name is in the navigation, its turnaround in New Ticket.
  if (result.response.ok) revalidatePath(`/locations/${locationId}`, "layout");
  return actionResult(result);
}

export async function checkReviewLink(
  locationId: string,
  url: string,
): Promise<components["schemas"]["ReviewLinkCheckDto"]["result"] | "invalid"> {
  const { data, response } = await (
    await api()
  ).POST("/locations/{locationId}/review-link/check", { ...path(locationId), body: { url } });
  // Refused by the rule Save applies, so Google was never asked.
  if (response.status === 400) return "invalid";
  return data?.result ?? "unknown";
}

// Redirects from here: refreshing the page they're on would be a 404 by then.
export async function deleteLocation(locationId: string, businessId: string) {
  const outcome = await actionResult(await (await api()).DELETE("/locations/{locationId}", path(locationId)));
  if (!outcome.ok) return outcome;
  revalidatePath("/", "layout");
  // Not "/", which can't lead back once it was their last one.
  redirect(`/businesses/${businessId}`);
}
