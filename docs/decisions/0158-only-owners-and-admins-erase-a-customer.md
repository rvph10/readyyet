# 0158: Only an Owner or an Admin erases a Customer

Date: 2026-11-15

Replaces ADR 0097's "Every Role can erase a Customer".

## Decision

Erasing a Customer (`DELETE /locations/:locationId/customers/:customerId`) is for an Owner or an Admin. An Employee gets a 403, and their Customer page keeps the "Erase this Customer" section with a line saying an Owner or an Admin can do it, without the button.

## Why

Erasure takes the titles, photos and feedback of every Ticket the Customer has, and can't be undone. Since ADR 0155, an Employee can't delete even one Ticket, for the same reason: the person who made a mistake isn't the one who can erase it. Letting them erase a whole Customer was the larger power with the weaker guard.

ADR 0097 let every Role erase because the Customer asks whoever is at the counter. They still can: the Employee sees who to pass the request on to, and an erasure request has a month to be answered, it doesn't have to happen at the counter.
