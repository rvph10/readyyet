# 0036: Turnaround time and how the estimated ready date is kept

Date: 2026-09-25

Extends ADR 0030, which has staff enter every Ticket's date by hand.

## Decision

### Turnaround time

A Location can set a turnaround time: a whole number of open days, 1 to 60, edited by the Owner and Admins like its other settings. Unset by default.

When it's set, a new Ticket's estimated ready date is filled in from it, unless staff send another date or `null` for none. The date is the turnaround time's number of open days after the drop-off date, on the Location's clock, the drop-off day itself not counted. A day is open when the Location's opening hours (ADR 0029) have a range on it. A Location without opening hours counts every day. Holidays aren't known, so they count as open.

The calculation lives in `packages/shared` (`turnaroundReadyDate`), so the web app can show the same prefilled date on the form before the Ticket is created.

### Dates

- A date is sent and returned as `YYYY-MM-DD`, stored as a Postgres `DATE`.
- It can't be before today on the Location's clock when it's set or changed. A form sending back a date that has since passed, unchanged, is accepted.
- It can't change once the Ticket has ended.

### The "later date" email

Each Ticket remembers the last date an email told the Customer: the ticket-created email when it had a date, or a previous "new date" email. Moving the date past that one queues an email due after the same delay as a Status email (ADR 0015). The sweep sends it only if the date is still later than the one told, the Ticket isn't `READY` or ended, and the usual rules for customer emails allow it. A Ticket created without a date has told the Customer nothing, so its first date sends no email.

## Why

The drop-off form is already long, and most shops promise the same delay for most jobs ("ready in 48 hours"). A turnaround time set once turns the date into zero input for the usual Ticket while staying the shop's own promise, not a guess by ReadyYet.

Open days because a date on which the shop is closed is one the Customer can't collect on: 2 days from a Friday means Tuesday for a shop closed Sunday and Monday, not Sunday.

Remembering what the Customer was told, rather than comparing with the previous value, is what makes a correction within the delay send nothing, and what keeps a Customer who never received a date from getting a "new date" email.
