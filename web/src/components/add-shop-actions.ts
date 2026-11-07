"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Country } from "react-phone-number-input";
import { getBusinessTypeOptions } from "@/app/(create-business)/businesses/new/business-types";
import { getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { getOwnedBusiness } from "@/lib/business";
import { getMe } from "@/lib/me";

// Only fetched once the drawer opens, as every page of an Owner can open it.
export async function addShopData(businessId: string) {
  const [business, me, businessTypes] = await Promise.all([
    getOwnedBusiness(businessId),
    getMe(),
    getBusinessTypeOptions(),
  ]);
  // A second shop is most likely in the same country as the first.
  const [first] = business.locations;
  const country = first && (await getLocation(first.id)).address?.addressCountry;
  return {
    businessName: business.name,
    email: me.email,
    country: country as Country | undefined,
    businessTypes: businessTypes.map(({ code, label }) => ({ code, label })),
  };
}

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
