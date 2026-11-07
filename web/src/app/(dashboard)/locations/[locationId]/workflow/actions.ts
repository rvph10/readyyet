"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";

const path = (locationId: string) => ({ params: { path: { locationId } } });

export async function saveWorkflow(locationId: string, statusCodes: string[]) {
  const result = await (
    await api()
  ).PUT("/locations/{locationId}/workflow", { ...path(locationId), body: { statusCodes } });
  if (result.response.ok) revalidatePath(`/locations/${locationId}/workflow`);
  return actionResult(result);
}

export async function resetWorkflow(locationId: string) {
  const result = await (await api()).DELETE("/locations/{locationId}/workflow", path(locationId));
  if (result.response.ok) revalidatePath(`/locations/${locationId}/workflow`);
  return actionResult(result);
}
