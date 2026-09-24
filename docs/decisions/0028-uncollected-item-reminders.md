# 0028: Uncollected item reminders

Date: 2026-09-24

Extends ADR 0015's list of customer emails.

## Decision

### Reminders

A Ticket that stays in `READY` sends the Customer a reminder 3 days and 10 days after the Status event that set `READY`, then nothing more. They count from that event, so a Ticket that leaves `READY` and reaches it again starts over. A reminder is only sent between 9:00 and 19:00 in the Location's time zone (ADR 0029), one due at night leaves the next morning.

The same rules as every customer email apply: no email address, a bounced or complained address, stopped updates or a deleted Location means no reminder.

On every plan.

### "I already picked it up"

The reminder email and the tracking page of a `READY` Ticket have an "I already picked it up" button. It records the time on the Ticket (`customer_collected_at`) and stops the remaining reminders. It doesn't change the Status: the Ticket stays `READY` until staff mark it `COMPLETED`.

Staff see it:

- on the Ticket, in the list and on its page, as "Customer says collected" with the time,
- through a `customerCollected` filter on the ticket list (ADR 0014), so a Location can clear them all at once,
- with two actions on the Ticket: mark it `COMPLETED` (the usual Status change, ADR 0016), or dismiss it if the item is still on the shelf, which clears the time. A dismissed Ticket gets the reminders it hasn't had yet.

Reaching `COMPLETED` clears nothing: the time stays on the Ticket as a record.

## Why

Pressings and repair shops keep forgotten items for weeks, taking shelf space and money. Two reminders catch most forgetful Customers, more would feel like spam and hurt the sending reputation every Location shares (ADR 0015). Staff then see the Ticket is still `READY` and can call.

The shop, not the Customer, decides a Ticket's Status. The Status history is the record the tracking page shows and every shop's reporting will use, and the tracking link can be forwarded, so a click on it shouldn't close a job the shop may still be holding. But when staff forget to mark a Ticket `COMPLETED`, the Customer is the one getting reminders for an item they already have, the button stops that at once. The time on the Ticket gives staff the rest: one filter lists every Ticket to close.

The 9:00 to 19:00 window is there because a reminder at 3 in the morning is the kind of email that gets marked as spam.
