"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";

// The version the page showed, not this server's: a page left open across
// a change can't accept terms it never displayed (ADR 0130).
export async function acceptTerms(businessId: string, termsVersion: string) {
  const result = await (
    await api()
  ).POST("/businesses/{businessId}/terms-acceptance", {
    params: { path: { businessId } },
    body: { termsVersion },
  });
  // The window asking is on every Business and Location page.
  if (result.response.ok) revalidatePath("/", "layout");
  return actionResult(result);
}
