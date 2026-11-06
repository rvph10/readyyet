import type { components } from "@/lib/api/schema";

type Invitation = components["schemas"]["InvitationDto"];

export type InvitationState = "pending" | "expired" | "declined";

// ADR 0017: the API's assertCanManage, so nobody is offered what it refuses.
// Nobody manages the Owner, and an Admin manages Employees only.
export function canManage(actorRole: string, targetRole: string) {
  if (targetRole === "OWNER") return false;
  return actorRole === "OWNER" || (actorRole === "ADMIN" && targetRole === "EMPLOYEE");
}

function stateOf({ status, expiresAt }: Invitation, now: Date): InvitationState | null {
  if (status === "DECLINED") return "declined";
  if (status === "EXPIRED" || (status === "PENDING" && new Date(expiresAt) <= now)) return "expired";
  return status === "PENDING" ? "pending" : null;
}

// What's still worth seeing, from the API's newest-first list: only the latest
// for each address, so inviting someone again replaces the invitation that
// lapsed, and nothing about someone who has since joined.
export function openInvitations(invitations: Invitation[], memberEmails: string[], now: Date) {
  const members = new Set(memberEmails.map((email) => email.toLowerCase()));
  const seen = new Set<string>();
  return invitations.flatMap((invitation) => {
    const email = invitation.email.toLowerCase();
    if (seen.has(email) || members.has(email)) return [];
    seen.add(email);
    const state = stateOf(invitation, now);
    return state ? [{ ...invitation, state }] : [];
  });
}

// The API's count against a plan's limit: pending invitations hold a place too.
export function placesTaken(members: number, invitations: { state: InvitationState }[]) {
  return members + invitations.filter(({ state }) => state === "pending").length;
}
