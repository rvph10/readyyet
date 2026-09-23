import { randomBytes } from "node:crypto";

// 12 url-safe chars (~72 bits of randomness), suitable for the
// readyyet.app/t/[code] public tracking link (ADR 0004). Collision
// probability is negligible enough that Ticket.trackingCode's @unique
// constraint is the only backstop needed, no retry loop.
export function generateTrackingCode(): string {
  return randomBytes(9).toString("base64url");
}
