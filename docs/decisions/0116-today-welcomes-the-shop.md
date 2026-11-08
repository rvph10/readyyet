# 0116: Today welcomes the shop

Date: 2026-11-08

Replaces ADR 0088's grid (four stats, the week's handovers, Tickets by step and the table of open Tickets), ADR 0108's Today columns and ADR 0111's table across the page's width. ADR 0088's overview route stays for the counts, the urgency order and Needs you, without its handovers and Tickets by step, which nothing reads any more.

## Decision

**Today opens on a hero:** the greeting, the one thing to know about the day (late, else ready, else due, else calm), New Ticket, and the day's four numbers, Ready the biggest. Each number opens the Tickets page on the matching view.

**Under it, for Owners and Admins:**

- **Finish setting up**, across the page while something is left: address, hours, turnaround, Google review link, logo (Owners only, as it's the Business's), team, first Ticket, first handover. It's worked out from the shop, so nothing is stored and it leaves once all is done. Only what's left is listed.
- **Tickets this month** beside **Activity.** The month has the last 6 months as bars and Customers new or returning, compared with last month up to the same day, not the whole month. Activity is the latest Status changes and who made them, with no counts per person, and scrolls at the month's height.
- **Up next** across the page: the 6 most urgent open Tickets with their next step, and a link to all of them. The full table with its filters is gone from Today, the Tickets page has it.

**An Employee gets only Up next and Activity** under the hero: they act on Tickets, the shop's growth isn't theirs to steer.

A shop with no Ticket yet shows the first-Ticket walkthrough, with the setup list beside it for those who can act on it.

Every number is on every plan. **One read-only route,** `GET /locations/:id/insights`, for every Role, gives the setup, the month and Activity. The day's numbers and Up next stay on the overview. Only Today reads it.

## Why

The old Today was a row of cards and a long table, which said what was in the shop but nothing a shop couldn't see on its own shelves, and a new shop met an empty page with no sense of what to do. The month shows whether the shop is growing, so it isn't kept for Pro.

Promises kept, the emails sent for the shop, and an Employee's own day were tried and dropped on review: they made the page busier without being what an Owner or an Employee comes to Today for.

The overview is read on every page for the navigation's counts, so the month's numbers get their own route rather than weighing on it. Activity stays a feed, as numbers per person would read as watching staff rather than helping them hand over.
