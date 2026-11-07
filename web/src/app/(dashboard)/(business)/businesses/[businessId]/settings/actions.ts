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

export async function setImage(businessId: string, kind: "logo" | "banner", image: FormData) {
  const client = await api();
  const options = {
    ...path(businessId),
    body: image as never,
    // Left to fetch, which sets the multipart boundary.
    bodySerializer: (body: unknown) => body as FormData,
  };
  const result =
    kind === "logo"
      ? await client.PUT("/businesses/{businessId}/logo", options)
      : await client.PUT("/businesses/{businessId}/banner", options);
  refreshed();
  return actionResult(result);
}

export async function removeImage(businessId: string, kind: "logo" | "banner") {
  const client = await api();
  const result =
    kind === "logo"
      ? await client.DELETE("/businesses/{businessId}/logo", path(businessId))
      : await client.DELETE("/businesses/{businessId}/banner", path(businessId));
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
