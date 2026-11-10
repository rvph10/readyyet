# 0128: How long personal data is kept

Date: 2026-11-10

Replaces the part of ADR 0017 that keeps a deleted Location's Customers, and adds to ADR 0026 (photos) and ADR 0081 (email log).

## Decision

What ReadyYet keeps, and when it goes. These are the periods the privacy notice, the customer data page and the DPA in the terms state.

| Data | Kept | How it goes |
|---|---|---|
| A Ticket's photos | 30 days after the Ticket ends | the hourly photo sweep (ADR 0026) |
| What an email said: HTML, text, attachments | 30 days | the daily retention task, at 03:30; who it went to, its type, dates and delivery status stay |
| Expired sessions and sign-in codes | until they expire | the daily retention task |
| A Customer | 24 months after their last Ticket ended, never while one is open | the daily retention task erases them |
| The Customers of a deleted Location | none | erased in the same transaction as the deletion; the daily task also erases any left by deletions before this ADR |

**Erasing a Customer** keeps the rows, a Ticket must reference its Customer, and removes everything personal: the name, email and phone, their Tickets' photos and feedback, what the emails about them said, and now **their Tickets' title and description too**, which staff write in their own words and can name the person ("Julie's wedding dress"). The title becomes `[deleted]`, shown as "Erased item" in the dashboard. An erased Customer's tracking link answers 404, like an unknown code. The same erasure runs on request, by the retention task and when a Location is deleted.

A Customer's 24 months count from the last status change of any of their Tickets, or from when the Customer was created if they have none.

## Why

The GDPR's storage limitation (art. 5.1.e) and our DPA promise that a shop's customers' data lasts no longer than the shop needs it. 24 months covers a customer coming back the next season or the year after, and the shop's own look back at its history; past that, a customer who hasn't been seen is no longer the shop's customer. The Tickets themselves stay, without anything personal, so the shop's counts and insights don't change when a Customer goes.

ADR 0017 kept a deleted Location's Tickets as permanent records, Customers included. Deleting a Location is the Owner saying they're done with that shop; keeping its customers' names and addresses after that has no purpose left. Exporting before deleting comes with the data export (Data Act art. 25).

An email's content is kept 30 days for support ("what did the customer receive?"), well past the one day retries last (ADR 0081). Better Auth deletes an expired session or code only when it's presented again, so without the task they'd stay forever.
