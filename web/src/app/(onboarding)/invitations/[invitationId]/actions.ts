"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionFailure, type ActionResult } from "@/lib/api/errors";

// Returns the Location rather than redirecting to it, so the page can say
// who was joined before leaving (ADR 0062).
export async function acceptInvitation(
  invitationId: string,
): Promise<{ ok: true; locationId: string } | ActionFailure> {
  const result = await (
    await api()
  ).POST("/invitations/{invitationId}/accept", {
    params: { path: { invitationId } },
  });
  if (result.data) {
    return { ok: true, locationId: result.data.locationId };
  }
  // Without data the API refused it, so this is the failure.
  return (await actionResult(result)) as ActionFailure;
}

// The page then shows the invitation as declined (ADR 0051).
export async function declineInvitation(invitationId: string): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/invitations/{invitationId}/decline", {
    params: { path: { invitationId } },
  });
  if (result.response.ok) {
    redirect(`/invitations/${invitationId}`);
  }
  return actionResult(result);
}
