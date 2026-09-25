// The five system statuses every workflow contains, see ADR 0007 and
// docs/domain/status-catalogue.md. Seeded as plain codes, there's no
// schema-level flag, so this list is what marks them.
export const SYSTEM_STATUS_CODES = ["RECEIVED", "READY", "COMPLETED", "CANCELLED", "REJECTED"] as const;

// A ticket at one of these is finished, no longer open.
export const ENDED_STATUS_CODES = ["COMPLETED", "CANCELLED", "REJECTED"] as const;

// A ticket reaching one of these emails its Customer, see ADR 0015. Every
// other status is visible on the tracking page only.
export const NOTIFYING_STATUS_CODES = [
  "READY",
  "AWAITING_APPROVAL",
  "AWAITING_CLIENT_INFO",
  "CANCELLED",
  "REJECTED",
] as const;
export type NotifyingStatusCode = (typeof NOTIFYING_STATUS_CODES)[number];

export function isEndedStatus(statusCode: string): boolean {
  return (ENDED_STATUS_CODES as readonly string[]).includes(statusCode);
}

export function isNotifyingStatus(statusCode: string): statusCode is NotifyingStatusCode {
  return (NOTIFYING_STATUS_CODES as readonly string[]).includes(statusCode);
}

// A ticket's estimated ready date is shown until it reaches READY or ends
// (ADR 0030), after that it says nothing the Status doesn't.
export function showsEstimatedReadyDate(statusCode: string): boolean {
  return statusCode !== "READY" && !isEndedStatus(statusCode);
}
