import { Prisma, SubscriptionStatus } from "@readyyet/db";

// ADR 0140: what a Location may email its Customers in a day, on its own
// clock. A busy shop stays well below; past it, it's abuse or a bug.
export const DAILY_CUSTOMER_EMAILS = { trial: 100, paid: 500 };

// Only what goes to Customers on its own counts. Staff copies, sign-in codes
// and a reply staff write to feedback don't.
export const CUSTOMER_EMAIL_TYPES = [
  "ticket_tracking_link",
  "ticket_status_update",
  "ticket_ready_reminder",
  "ticket_ready_date_changed",
  "ticket_feedback_request",
];

// Sign-in codes one address may get in an hour, so the form can't be used to
// flood someone's inbox.
export const SIGN_IN_CODES_PER_HOUR = 5;

// Customer emails a Location has had since its midnight, sent or held back.
// From today's rows only, through the created_at index.
export function customerEmailsToday(locationId: string) {
  return Prisma.sql`
    SELECT
      count(e.id) FILTER (WHERE e.status <> 'LIMITED')::int AS sent,
      count(e.id) FILTER (WHERE e.status = 'LIMITED')::int AS limited
    FROM location l
    JOIN email_log e
      ON e.created_at >= (date_trunc('day', now() AT TIME ZONE l.time_zone) AT TIME ZONE l.time_zone) AT TIME ZONE 'UTC'
    JOIN ticket t ON t.id = e.ticket_id AND t.location_id = l.id
    WHERE l.id = ${locationId}::uuid
      AND e.type IN (${Prisma.join(CUSTOMER_EMAIL_TYPES)})`;
}

// The higher limit only for a Location that pays: a trial, a frozen one or
// one that never had a plan gets the lower.
export function dailyCustomerEmails(status: SubscriptionStatus | null) {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE
    ? DAILY_CUSTOMER_EMAILS.paid
    : DAILY_CUSTOMER_EMAILS.trial;
}
