"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

export type NewBusiness = components["schemas"]["CreateBusinessDto"];

export async function createBusiness(business: NewBusiness): Promise<ActionResult> {
  const result = await (await api()).POST("/businesses", { body: business });
  if (result.data) {
    redirect(`/locations/${result.data.locations[0].id}`);
  }
  return actionResult(result);
}
