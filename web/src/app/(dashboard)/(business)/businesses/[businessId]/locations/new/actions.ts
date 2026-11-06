"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

// ADR 0082: a later Location has no trial, so it goes straight to choosing a
// plan, the only way it can take Tickets.
export async function addLocation(
  businessId: string,
  location: components["schemas"]["CreateLocationDto"],
): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/businesses/{businessId}/locations", { params: { path: { businessId } }, body: location });
  if (result.data) {
    revalidatePath("/", "layout");
    redirect(`/locations/${result.data.id}/billing`);
  }
  return actionResult(result);
}
