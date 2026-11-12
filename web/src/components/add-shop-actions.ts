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

// ADR 0082: a later Location has no trial, so the plan is chosen in the same
// drawer and it goes straight to paying, the only way it can take Tickets. A
// checkout that doesn't open leaves the shop on its billing page, to finish.
export async function addLocation(
  businessId: string,
  location: components["schemas"]["CreateLocationDto"],
  plan: components["schemas"]["CheckoutDto"],
): Promise<ActionResult> {
  const client = await api();
  const result = await client.POST("/businesses/{businessId}/locations", {
    params: { path: { businessId } },
    body: location,
  });
  if (!result.data) {
    return actionResult(result);
  }
  const locationId = result.data.id;
  revalidatePath("/", "layout");
  const checkout = await client.POST("/locations/{locationId}/billing/checkout", {
    params: { path: { locationId } },
    body: plan,
  });
  redirect(checkout.data?.url ?? `/locations/${locationId}/billing`);
}
