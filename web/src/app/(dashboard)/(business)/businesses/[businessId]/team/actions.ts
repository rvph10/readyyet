"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

// One call per Location, as a Membership is per Location (ADR 0002). Each
// answers for itself, so one at its plan's limit doesn't stop the others.
export async function inviteToLocations(
  businessId: string,
  locationIds: string[],
  invitation: components["schemas"]["CreateInvitationDto"],
) {
  const client = await api();
  const results = await Promise.all(
    locationIds.map(async (locationId) => ({
      locationId,
      outcome: await actionResult(
        await client.POST("/locations/{locationId}/invitations", {
          params: { path: { locationId } },
          body: invitation,
        }),
      ),
    })),
  );
  revalidatePath(`/businesses/${businessId}`, "layout");
  return results;
}
