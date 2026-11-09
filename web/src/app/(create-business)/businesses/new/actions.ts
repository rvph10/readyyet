"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { REF_COOKIE } from "@/lib/referral";

export type NewBusiness = Omit<components["schemas"]["CreateBusinessDto"], "referralCode">;

export async function createBusiness(business: NewBusiness): Promise<ActionResult> {
  const jar = await cookies();
  const result = await (
    await api()
  ).POST("/businesses", {
    body: { ...business, referralCode: jar.get(REF_COOKIE)?.value },
  });
  if (result.data) {
    jar.delete(REF_COOKIE);
    redirect(`/locations/${result.data.locations[0].id}`);
  }
  return actionResult(result);
}
