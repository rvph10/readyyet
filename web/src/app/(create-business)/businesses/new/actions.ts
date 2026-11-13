"use server";

import { api } from "@/lib/api/client";
import { actionResult, type ActionFailure } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

export type NewBusiness = components["schemas"]["CreateBusinessDto"];

// No redirect from here: the form counts the step first (ADR 0136), then goes on.
export async function createBusiness(business: NewBusiness): Promise<{ ok: true; locationId: string } | ActionFailure> {
  const result = await (await api()).POST("/businesses", { body: business });
  if (result.data) {
    return { ok: true, locationId: result.data.locations[0].id };
  }
  return (await actionResult(result)) as ActionFailure;
}
