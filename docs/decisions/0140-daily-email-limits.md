# 0140: Daily email limits

Date: 2026-11-12

## Decision

**Per Location, per day.** A Location may send its Customers 100 emails a day during its trial and 500 once paying, counted from midnight on its own clock. Only emails to Customers count: the tracking link, Status updates, ready reminders, ready date changes, the feedback request and the reply to feedback. Staff copies and sign-in codes don't.

Past the limit, an email to a Customer is recorded with the new status `LIMITED` and given up on at once: it isn't sent then, nor later, when a Status update would be stale. Everything else keeps working, Tickets, Status changes, the tracking page and its QR code. The Ticket shows that its last email wasn't sent, and the Location's Today page tells managers that emails start again tomorrow. The first held back email of the day goes to Sentry, as at these volumes it's abuse or a bug.

**Per address, per hour.** An address gets at most 5 sign-in codes an hour. Past that the form still says the code was sent, as it does for any address, but nothing goes out.

The numbers are constants in `api/src/email/email-limits.ts`.

## Why

Every email counts against the Resend plan, and a burst also harms the sending domain's reputation, which every shop shares (audit row 11 and 12, roadmap step 3.3). A busy shop with 50 Tickets a day and about 4 emails each stays well below 500. The values and the behaviour were agreed with the user on 2026-11-12.
