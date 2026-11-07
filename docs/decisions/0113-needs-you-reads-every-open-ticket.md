# 0113: Needs you reads every open Ticket

Date: 2026-11-07

Completes ADR 0112's "the count is always what's left to do", which the bell couldn't keep past 100 open Tickets. Replaces ADR 0108's "holds every open Ticket" for Today's table.

## Decision

`GET /locations/:id/tickets/overview` gains `needsYou`, with what a person has to settle among every open Ticket: Customers who say they collected, emails that failed, and items waiting `LONG_WAIT_DAYS` or more. The API decides which Tickets these are, and the 10 days move to the shared package.

The bell counts all of them and shows the first 20 of each kind, most urgent first, with a link to the full list where one exists: `?view=collected` and `?view=ready`. Failed emails have no list of their own, so more than 20 of those come up as the first are dealt with.

`tickets` stays the 100 most urgent, for Today's table, whose filters and sorting work among those.

## Why

The bell filtered the same 100 rows as Today's table, cut by urgency, so in a very busy shop a failed email on a Ticket due next month never showed. The urgency order is the wrong filter for what needs a person: the least urgent Ticket can be the one with a problem.

The API already reads every open Ticket for its counts, so this adds no query. The 20 keep the layout from sending every row to the browser on every page.
