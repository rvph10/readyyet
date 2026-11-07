"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

// The whole Location, as the seats its Billing page counts change too.
function refreshed(locationId: string) {
  revalidatePath(`/locations/${locationId}`, "layout");
}

const invitationPath = (locationId: string, invitationId: string) => ({
  params: { path: { locationId, invitationId } },
});
const memberPath = (locationId: string, membershipId: string) => ({
  params: { path: { locationId, membershipId } },
});

export async function inviteMember(locationId: string, invitation: components["schemas"]["CreateInvitationDto"]) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/invitations", { params: { path: { locationId } }, body: invitation });
  refreshed(locationId);
  return actionResult(result);
}

export async function resendInvitation(locationId: string, invitationId: string) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/invitations/{invitationId}/resend", invitationPath(locationId, invitationId));
  refreshed(locationId);
  return actionResult(result);
}

export async function revokeInvitation(locationId: string, invitationId: string) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/invitations/{invitationId}/revoke", invitationPath(locationId, invitationId));
  refreshed(locationId);
  return actionResult(result);
}

export async function changeRole(locationId: string, membershipId: string, role: "ADMIN" | "EMPLOYEE") {
  const result = await (
    await api()
  ).PATCH("/locations/{locationId}/memberships/{membershipId}", {
    ...memberPath(locationId, membershipId),
    body: { role },
  });
  refreshed(locationId);
  return actionResult(result);
}

export async function removeMember(locationId: string, membershipId: string) {
  const result = await (
    await api()
  ).DELETE("/locations/{locationId}/memberships/{membershipId}", memberPath(locationId, membershipId));
  refreshed(locationId);
  return actionResult(result);
}

// Redirects from here: refreshing the page they're on would be a 404 by then.
export async function leaveLocation(locationId: string) {
  const outcome = await actionResult(
    await (await api()).DELETE("/locations/{locationId}/memberships/me", { params: { path: { locationId } } }),
  );
  if (!outcome.ok) return outcome;
  revalidatePath("/", "layout");
  redirect("/");
}
