import "server-only";
import { cache } from "react";
import { getBilling, getDaysToChoosePlan, getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
import { api } from "@/lib/api/client";
import { getOwnedBusiness } from "@/lib/business";

// An Owner has an OWNER Membership on every Location, so the Location routes
// answer for all of them, one call each in parallel (ADR 0102). As on the
// picker, a Location whose Tickets fail to load still shows, without numbers.
export const getBusinessLocations = cache(async (businessId: string) => {
  const [business, client] = await Promise.all([getOwnedBusiness(businessId), api()]);
  const rows = await Promise.all(
    business.locations.map(async ({ id, name }) => {
      const [billing, daysLeft, { timeZone }, overview] = await Promise.all([
        getBilling(id),
        getDaysToChoosePlan(id, "OWNER"),
        getLocation(id),
        client.GET("/locations/{locationId}/tickets/overview", { params: { path: { locationId: id } } }),
      ]);
      return {
        id,
        name,
        billing,
        daysLeft,
        timeZone,
        counts: overview.data?.counts ?? null,
        handedOver: overview.data?.handedOver ?? null,
      };
    }),
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name));
});
