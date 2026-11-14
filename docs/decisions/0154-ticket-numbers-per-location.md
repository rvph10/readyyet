# 0154: Ticket numbers per Location

Date: 2026-11-13

## Decision

Every Ticket has a number, 1, 2, 3 within its Location, and screens show it as `#12` where they showed the database id. Existing Tickets were numbered in the order they were created. URLs and the API still address a Ticket by its id.

- The database gives the number: a trigger on insert raises `location.ticket_count` and takes the new value. A unique index on `(location_id, number)` backs it.
- The dashboard search finds `12` or `#12`, and the list sorts by number.
- The Customer sees it too: on the tracking page beside the item, and in the status emails beside the title, so both sides can quote the same short number at the counter or on the phone.
- A deleted Ticket's number is not given again, and a number never changes.

## Why

The id is shared by every shop, so a new shop's first Ticket could read `#4812`. Shops number their slips per counter, and staff and Customers need one short reference they can say aloud.

The trigger rather than the app: the update of the Location's row locks it, so two Tickets created at the same moment can't take the same number, and the API still running during a deploy inserts Tickets without knowing the column. It's the usual Postgres way to keep a counter per tenant.

Showing the number to the Customer tells them roughly how many Tickets the shop has taken. A shop's volume is no secret worth the confusion of two references, one for the shop and one for the Customer.
