# 0030: Estimated ready date

Date: 2026-09-24

Extends ADR 0013's list of what the tracking page returns, and ADR 0015's list of customer emails.

## Decision

A Ticket has an optional estimated ready date, a calendar date without a time, in the Location's time zone (ADR 0029). Any member of the Location sets or changes it, at drop-off or later, while the Ticket is open.

- The tracking page shows it until the Ticket reaches `READY` or ends. The ticket-created email includes it when it's set.
- When staff move it later, the Customer gets a short email with the new date. It's queued and delayed like a Status update email (ADR 0015), and sent only if the date is still later than the last one the Customer was told, so a correction made within the window sends nothing. Moving it earlier, or setting it for the first time after drop-off, only updates the tracking page.
- The same rules as every customer email apply: no email address, a bounced or complained address, stopped updates or a deleted Location means no email.
- Staff see Tickets whose date has passed and that haven't reached `READY` through an `overdue` filter on the ticket list (ADR 0014).

ReadyYet doesn't calculate the date. On every plan.

## Why

Only the shop knows its workload and whether a part is on order, so the date is theirs to give, the same way it's written on a paper ticket today. A date computed from past Tickets could come later as a suggestion that fills in the field, once a Location has enough history to make it meaningful, never as a date promised to the Customer on ReadyYet's own guess.

A date, not a time, because that's what shops promise and what Customers plan around. Only a later date is emailed because that's the change that saves a Customer a wasted trip, an earlier one is good news the `READY` email already delivers. The delay and the "still later" check reuse ADR 0015's reasoning: a typo corrected within seconds shouldn't reach the Customer.

The `overdue` filter is how staff find the promises they're about to break, before the Customer calls to ask.
