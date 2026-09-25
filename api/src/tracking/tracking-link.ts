import type { Prisma } from "@readyyet/db";
import { ENDED_STATUS_CODES, isEndedStatus } from "@readyyet/shared";

// A tracking link stops working this long after the ticket ends, see
// docs/decisions/0013-public-tracking-endpoint.md.
const LINK_LIFETIME_AFTER_END_MS = 30 * 24 * 60 * 60 * 1000;

// statusSince is when the ticket reached its current status, its latest
// status event (every change writes one, the first included).
export function isTrackingLinkExpired(currentStatusCode: string, statusSince: Date): boolean {
  return isEndedStatus(currentStatusCode) && Date.now() - statusSince.getTime() > LINK_LIFETIME_AFTER_END_MS;
}

// The same rule as a query: no status event after the cutoff means the
// ticket has been at its ended status since before it.
export function trackingLinkExpiredWhere(): Prisma.TicketWhereInput {
  const cutoff = new Date(Date.now() - LINK_LIFETIME_AFTER_END_MS);
  return {
    currentStatus: { code: { in: [...ENDED_STATUS_CODES] } },
    statusEvents: { none: { createdAt: { gte: cutoff } } },
  };
}

// The web app's pages for a ticket (ADR 0004, ADR 0015).
export function trackingUrl(trackingCode: string): string {
  return `${process.env.WEB_URL}/t/${trackingCode}`;
}

export function stopUpdatesUrl(trackingCode: string): string {
  return `${trackingUrl(trackingCode)}/stop-updates`;
}

// Asks the Customer to confirm before it records anything, a mail
// scanner opening the link must not mark the item collected (ADR 0037).
export function collectedUrl(trackingCode: string): string {
  return `${trackingUrl(trackingCode)}/collected`;
}

// What mail clients POST to for a one-click unsubscribe (RFC 8058): the
// API itself, not the web page, since that request has no browser.
// BETTER_AUTH_URL is the API's own public URL.
export function oneClickStopUrl(trackingCode: string): string {
  return `${process.env.BETTER_AUTH_URL}/tracking/${trackingCode}/stop-notifications`;
}
