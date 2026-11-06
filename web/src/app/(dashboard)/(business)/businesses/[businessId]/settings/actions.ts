"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";

const path = (businessId: string) => ({ params: { path: { businessId } } });

// The Business's name and logo are in every Location's navigation too.
function refreshed() {
  revalidatePath("/", "layout");
}

export async function renameBusiness(businessId: string, name: string) {
  const result = await (await api()).PATCH("/businesses/{businessId}", { ...path(businessId), body: { name } });
  refreshed();
  return actionResult(result);
}

export async function setLogo(businessId: string, logo: FormData) {
  const result = await (
    await api()
  ).PUT("/businesses/{businessId}/logo", {
    ...path(businessId),
    body: logo as never,
    // Left to fetch, which sets the multipart boundary.
    bodySerializer: (body) => body as unknown as FormData,
  });
  refreshed();
  return actionResult(result);
}

export async function removeLogo(businessId: string) {
  const result = await (await api()).DELETE("/businesses/{businessId}/logo", path(businessId));
  refreshed();
  return actionResult(result);
}

// Redirects from here: this page is a 404 for them once it's done.
export async function transferOwnership(businessId: string, userId: string) {
  const outcome = await actionResult(
    await (await api()).POST("/businesses/{businessId}/transfer-ownership", { ...path(businessId), body: { userId } }),
  );
  if (!outcome.ok) return outcome;
  refreshed();
  redirect("/");
}
