# 0098: Numbered pagination, and finding Customers by email or phone

Date: 2026-11-06

Replaces ADR 0014's cursor pagination and ADR 0079's "Older Tickets" and "Back to newest" links and `?cursor=`, for the Ticket, Customer and private feedback lists. Extends ADR 0080's one-field search for a returning Customer. `Commission` lists, which have no page in the web app, keep their cursor.

## Decision

**Lists are paged by number.** `GET` on these lists takes `?page=` and `?take=` and returns `{ items, total }`, with `total` counting what the filters match. Every table and list shows "31 to 60 of 245" and numbered pages with previous and next arrows, as one `Pagination` component, in the URL as `?page=`. Where there's no room for the numbers, on a phone or in a narrow tile, it shows "Page 2 of 9" between the arrows, decided by the room it has rather than the screen's width.

**A Customer is found by name, email or phone** on `GET /locations/:id/customers?q=`. Phones match however they're written, like the Ticket search (ADR 0014). This one search serves the Customers page and the New Ticket form.

**The New Ticket form looks for a returning Customer from whichever of the name, email and phone was typed last,** and choosing one fills in their details. So does starting a Ticket from a Customer's page, which opens with them already chosen.

**A lookup while typing costs little.** It asks only after 300ms without typing, never twice for the same text, and not before 2 letters of a name, 4 of an email, or a phone number past its dialling code. Only an answer to the exact text in the field is offered, as a click on an older answer could send a Ticket's email to the wrong person. The Customers page's search box offers matches the same way, and Enter lists all of them.

## Why

Numbers tell staff how long a list is and let them go to a place in it, which "Older" can't: a cursor knows only the next page, and neither the total nor a way back.

ADR 0014 chose cursors so pages stay stable while Tickets arrive, and because the tables grow without limit. The cost of giving that up is small here. A list is always scoped to one Location, so an offset stays small, and the count and offset use the same Location-scoped indexes. A Ticket arriving while someone reads page 2 can repeat one row on page 3, which is harmless when the list refreshes every minute anyway. A page past the end, after colleagues moved or erased things, redirects to the last one.

Searching email and phone means a Customer who gives their number at the counter isn't entered a second time, which is what ADR 0080's one record relies on.
