// The five system statuses every workflow contains, see ADR 0007 and
// docs/domain/status-catalogue.md. Seeded as plain codes, there's no
// schema-level flag, so this list is what marks them.
export const SYSTEM_STATUS_CODES = ["RECEIVED", "READY", "COMPLETED", "CANCELLED", "REJECTED"] as const;

// A ticket at one of these is finished, no longer open.
export const ENDED_STATUS_CODES = ["COMPLETED", "CANCELLED", "REJECTED"] as const;

export function isEndedStatus(statusCode: string): boolean {
  return (ENDED_STATUS_CODES as readonly string[]).includes(statusCode);
}
