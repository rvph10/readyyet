"use server";

import { TERMS_VERSION } from "@readyyet/shared";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";

export async function acceptTerms(businessId: string) {
  const result = await (
    await api()
  ).POST("/businesses/{businessId}/terms-acceptance", {
    params: { path: { businessId } },
    body: { termsVersion: TERMS_VERSION },
  });
  // The banner asking is on every page of the app.
  if (result.response.ok) revalidatePath("/", "layout");
  return actionResult(result);
}
