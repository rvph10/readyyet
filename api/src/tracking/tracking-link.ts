import { isEndedStatus } from "@readyyet/shared";

// A tracking link stops working this long after the ticket ends, see
// docs/decisions/0013-public-tracking-endpoint.md.
const LINK_LIFETIME_AFTER_END_MS = 30 * 24 * 60 * 60 * 1000;

// statusSince is when the ticket reached its current status, its latest
// status event (every change writes one, the first included).
export function isTrackingLinkExpired(currentStatusCode: string, statusSince: Date): boolean {
  return isEndedStatus(currentStatusCode) && Date.now() - statusSince.getTime() > LINK_LIFETIME_AFTER_END_MS;
}

// The web app's pages for a ticket (ADR 0004, ADR 0015).
export function trackingUrl(trackingCode: string): string {
  return `${process.env.WEB_URL}/t/${trackingCode}`;
}

export function stopUpdatesUrl(trackingCode: string): string {
  return `${trackingUrl(trackingCode)}/stop-updates`;
}
