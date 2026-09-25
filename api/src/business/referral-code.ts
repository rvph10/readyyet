import { randomBytes } from "node:crypto";

// 8 url-safe chars (48 bits), short enough to share by hand. Like a
// tracking code, the column's unique constraint is the only backstop needed
// at this number of Businesses and sales partners (ADR 0040).
export function generateReferralCode(): string {
  return randomBytes(6).toString("base64url");
}
