import { Prisma, SubscriptionStatus } from "@readyyet/db";

// ADR 0140: what a Location may email its Customers in a day, on its own
// clock. A busy shop stays well below; past it, it's abuse or a bug.
export const DAILY_CUSTOMER_EMAILS = { trial: 100, paid: 500 };

// Only what goes to Customers counts. Staff copies and sign-in codes don't.
export const CUSTOMER_EMAIL_TYPES = [
  "ticket_tracking_link",
  "ticket_status_update",
  "ticket_ready_reminder",
  "ticket_ready_date_changed",
  "ticket_feedback_request",
  "feedback_reply",
];

// Sign-in codes one address may get in an hour, so the form can't be used to
// flood someone's inbox.
export const SIGN_IN_CODES_PER_HOUR = 5;

// Customer emails a Location has had since its midnight, sent or held back.
export function customerEmailsToday(locationId: string) {
  return Prisma.sql`
    SELECT
      count(e.id) FILTER (WHERE e.status <> 'LIMITED')::int AS sent,
      count(e.id) FILTER (WHERE e.status = 'LIMITED')::int AS limited
    FROM location l
    JOIN ticket t ON t.location_id = l.id
    JOIN email_log e ON e.ticket_id = t.id
    WHERE l.id = ${locationId}::uuid
      AND e.type IN (${Prisma.join(CUSTOMER_EMAIL_TYPES)})
      AND e.created_at >= (date_trunc('day', now() AT TIME ZONE l.time_zone) AT TIME ZONE l.time_zone) AT TIME ZONE 'UTC'`;
}

export function dailyCustomerEmails(status: SubscriptionStatus | undefined) {
  return status === SubscriptionStatus.TRIAL ? DAILY_CUSTOMER_EMAILS.trial : DAILY_CUSTOMER_EMAILS.paid;
}
