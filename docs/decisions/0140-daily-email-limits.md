# 0140: Daily email limits

Date: 2026-11-12

## Decision

**Per Location, per day.** A Location may send its Customers 100 emails a day during its trial and 500 once paying, counted from midnight on its own clock. Only emails sent to Customers on the app's own count: the tracking link, Status updates, ready reminders, ready date changes and the feedback request. Staff copies, sign-in codes and a reply staff write to feedback don't. The higher limit is for a Location that pays (active or past due); a trial, a frozen Location or one without a plan gets the lower.

Past the limit, an email to a Customer is recorded with the new status `LIMITED` and given up on at once: it isn't sent then, nor later, when a Status update would be stale. Everything else keeps working, Tickets, Status changes, the tracking page and its QR code. The Ticket shows for a day that its last email wasn't sent, the Location's Today page tells managers that emails start again tomorrow, and resending the tracking link by hand is refused rather than reported as sent. A ready date in a held back email doesn't count as told to the Customer. The first held back email of the day goes to Sentry, as at these volumes it's abuse or a bug.

**Per address, per hour.** An address gets at most 5 sign-in codes an hour. Past that, the request is refused with "too many attempts" before Better Auth stores a new code, so the code already sent stays valid.

The numbers are constants in `api/src/email/email-limits.ts`.

## Why

Every email counts against the Resend plan, and a burst also harms the sending domain's reputation, which every shop shares (audit row 11 and 12, roadmap step 3.3). A busy shop with 50 Tickets a day and about 4 emails each stays well below 500. The values and the behaviour were agreed with the user on 2026-11-12.
