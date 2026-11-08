# 0116: Today welcomes the shop

Date: 2026-11-08

Replaces ADR 0088's grid (four stats, the week's handovers, Tickets by step and the table of open Tickets), ADR 0108's Today columns and ADR 0111's table across the page's width. ADR 0088's overview route stays for the counts, the urgency order and Needs you, without its handovers and Tickets by step, which nothing reads any more.

## Decision

**Today opens on a hero:** the greeting, the one thing to know about the day (late, else ready, else due, else calm), New Ticket, and the day's four numbers, Ready the biggest. Each number opens the Tickets page on the matching view.

**Under it, a bento of different scales:**

- **Tickets this month**, with the last 6 months as bars and Customers new or returning. It's compared with last month up to the same day, not the whole month. An Employee sees **Your day** in its place: Tickets they created and moved today.
- **Promises kept:** the share of Tickets that reached Ready on or before the date given, and the average time to get ready beside the shop's turnaround.
- **ReadyYet kept them posted:** emails that went out to Customers this month, with pickup reminders, review requests and private notes.
- **Up next:** the 6 most urgent open Tickets with their next step, and a link to all of them. The full table with its filters is gone from Today, the Tickets page has it.
- **Activity:** the latest Status changes and who made them, for every Role. No counts per person.
- **Finish setting up**, for Owners and Admins while something is left: address, hours, turnaround, Google review link, logo (Owners only, as it's the Business's), team, first Ticket, first handover. It's worked out from the shop, so nothing is stored and it leaves once all is done. Only what's left is listed.

A shop with no Ticket yet shows the first-Ticket walkthrough, with the setup list beside it for those who can act on it.

Every number is on every plan. **One read-only route,** `GET /locations/:id/insights`, for every Role, gives all of it except the day's numbers and Up next, which stay on the overview. Only Today reads it.

## Why

The old Today was a row of cards and a long table, which said what was in the shop but nothing a shop couldn't see on its own shelves, and a new shop met an empty page with no sense of what to do. The month, the promises kept and the emails sent show what ReadyYet does for the shop, which is also what makes a trial convert, so they aren't kept for Pro.

The overview is read on every page for the navigation's counts, so the month's numbers get their own route rather than weighing on it. Activity stays a feed, as numbers per person would read as watching staff rather than helping them hand over.
