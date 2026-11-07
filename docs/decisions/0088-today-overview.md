# 0088: Today, a Location's overview

Date: 2026-11-05

Replaces ADR 0079's "A Location opens on its Tickets". The rest of ADR 0079 still applies to the Tickets page, except what's said here.

## Decision

**A Location opens on Today** at `/locations/:locationId`. The Ticket list moves to `/locations/:locationId/tickets`, unchanged in its views and newest-first order.

Today greets the User in the page's header, then shows, on one grid: four stats (ready for pickup, running late, due today, in the shop), the week's handovers as a chart, open Tickets by step, and Needs you, and under them one table of open Tickets with filters. A stat links to the table filtered. A row's next step is one click, with Undo in its toast.

**Needs you** lists what only a person can settle: private feedback, Customers who say they collected, emails that didn't arrive, and items waiting 10 days or more. A trial with 3 days or fewer left joins it. Owners and Admins see feedback and the trial, Employees the rest.

**One read-only route**, `GET /locations/:id/tickets/overview`, for every Role, gives the counts, Tickets by step, the last 14 days of handovers and the open Tickets by urgency: late, then ready by longest wait, then by date, undated last. It returns the first 100, with each one's next step. The counts cover every open Ticket. The route allows 240 calls a minute like the list, as the navigation's counts read it on every page.

The list's rows gain the Customer's email and phone, and `statusSince`, when the Ticket reached its Status, which is also what "Waiting 3 days" and "Last update" show.

**The Tickets page's own search box is gone.** One search in every page's header replaces it. It opens a Ticket directly, or the Tickets page with `?view=all&q=`, which ADR 0079's links still drive.

## Why

The first thing a shop needs is what needs doing, and newest first buried it: late Tickets sat at the bottom of the list. Its owner also wanted an overview on arrival rather than a list that changes depending on a card.

ADR 0079 kept counts off the tabs because each cost a request. Open Tickets are what's physically in the shop, so few enough to read in one query, which gives every count and the urgency order together, with no new index or stored counter. Sorting by urgency can't use the cursor pagination of the list, which is why it's a separate route with a cap rather than a `sort` parameter.

Only Tickets with a failed email are asked about individually, so `emailFails` doesn't cost a query per open Ticket.

The next step is worked out in the API, for each Ticket's own frozen Workflow, instead of sending every Ticket's steps to the browser. It follows the same rule as `statusChoices` on the Ticket page.
