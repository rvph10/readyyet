"use server";

import { ErrorCode } from "@readyyet/shared";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult, type ActionFailure } from "@/lib/api/errors";
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
    locationIds.map(async (locationId) => {
      try {
        const result = await client.POST("/locations/{locationId}/invitations", {
          params: { path: { locationId } },
          body: invitation,
        });
        return { locationId, outcome: await actionResult(result) };
      } catch (error) {
        // Caught so the ones already sent aren't lost with it, so reported here.
        Sentry.captureException(error);
        return { locationId, outcome: { ok: false, code: ErrorCode.INTERNAL_ERROR } as ActionFailure };
      }
    }),
  );
  revalidatePath(`/businesses/${businessId}`, "layout");
  return results;
}
