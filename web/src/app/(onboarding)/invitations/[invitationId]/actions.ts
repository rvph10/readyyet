"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";

export async function acceptInvitation(invitationId: string): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/invitations/{invitationId}/accept", {
    params: { path: { invitationId } },
  });
  if (result.data) {
    redirect(`/locations/${result.data.locationId}`);
  }
  return actionResult(result);
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
