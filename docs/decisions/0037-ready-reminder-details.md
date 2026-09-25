# 0037: How uncollected item reminders are scheduled and confirmed

Date: 2026-09-25

Implements ADR 0028, and settles three points it leaves open.

## Decision

- **A new `READY` clears the "collected" mark.** When a Ticket reaches `READY` through a Status change, its reminders start over (ADR 0028) and `customer_collected_at` is cleared with them. Reaching `COMPLETED` still clears nothing.
- **Only Tickets reaching `READY` after this ships get reminders.** Tickets already at `READY` when it's deployed get none, nothing is backfilled.
- **The email link doesn't record anything by itself.** The reminder's "I already picked it up" link opens a page of the web app that asks the Customer to confirm, which then calls `POST /tracking/:code/collected`, the same route the tracking page's button uses.

Reminders are scheduled on the Ticket: reaching `READY` sets the first one 3 days later, sending it sets the second 10 days after that `READY` event, sending the second clears it. Leaving `READY` changes nothing, a sweep only looks at Tickets currently at `READY`, so undoing a move away from `READY` picks the reminders up where they were. A sweep every 15 minutes sends the due ones between 9:00 and 19:00 on the Location's clock.

## Why

A mark set during an earlier `READY` says the Customer had the item then. Once staff take it back to work and announce it ready again, that's no longer true, and keeping it would silently stop the reminders the ADR says a new `READY` starts.

A backfill would send a reminder at 9:00 on the first morning to every Customer whose Ticket has sat at `READY` for more than 3 days, for items staff may have handed over without marking them `COMPLETED`, which is exactly the case the button exists for, all at once.

Mail security scanners open every link in an email before the Customer does. A link that recorded the pickup on opening would mark items collected that nobody collected, and stop their reminders. The same reason put "stop updates" behind a page (ADR 0015).
