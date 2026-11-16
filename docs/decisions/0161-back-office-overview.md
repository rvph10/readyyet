# 0161: Back-office overview

Date: 2026-11-16

## Decision

`/admin` becomes an overview of how ReadyYet grows, and the sales partners list moves to `/admin/sales-partners`, next to the pages it already links to (ADR 0120).

- `GET /admin/overview` gives, for Users, Locations and Tickets, the total, a count per week for the last 12 weeks and last week's count up to the same weekday, the same comparison as a Location's month tile (ADR 0116).
- Weeks start on a Monday in Brussels, where ReadyYet is run.
- Locations are also split by subscription: in a trial, paying, past due, or inactive (a trial that ended without paying, or a subscription that ended).
- The 10 newest accounts are listed with their first Business, their Locations and their Tickets, so a new sign-up shows up as soon as it happens.
- The platform admin's own accounts, and the Businesses they own, count nowhere: they are where the admin tests production.
- Counting happens in the database, by day, then weeks are put together in the API. Loading every Ticket to count it held a test run for minutes on 96,000 local Tickets.
- The charts reuse the bar chart of the month tile, no chart library.

## Why

The back office only knew about sales partners, so the only way to see whether anyone signed up was a database query or PostHog, which counts only visitors who accepted cookies (ADR 0132). Weeks rather than months, because early on a month chart would have two bars.
