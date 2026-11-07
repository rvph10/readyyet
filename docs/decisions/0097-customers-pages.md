# 0097: The Customers pages

Date: 2026-11-06

## Decision

`/locations/:locationId/customers` lists a Location's Customers A to Z, with their email, phone and the day they first came in, for every Role. Its search is ADR 0098's. An address that fails shows in red in its row.

`/locations/:locationId/customers/:customerId` is a bento: who they are and how to reach them, how many of their items are ready and in the shop, and all their Tickets, newest first, scrolling inside their tile. A Ticket's page links to its Customer. Editing happens in a side panel, as ADR 0087 asks, and saves only what changed.

**Every Role can erase a Customer,** as the API already allows. A confirmation says what goes and what stays, and warns when Tickets are still open.

An erased Customer is no longer in the list and their page is a 404, while their Tickets stay under "Erased Customer", as `docs/architecture/data-model.md#gdpr-erasure` describes.

## Why

Staff come here to find one person, so the order is the one people expect from a contact list, and the day's urgency stays on Today (ADR 0088).

The stats count what someone at the counter asks about: what can be handed over now and what's still being worked on. A total of Tickets or a Customer count would need new API work and nobody would act on it.

Whoever is at the counter is who a Customer asks to delete their data, and that's often an Employee, so they can act on it there. Erasure can't be undone and takes photos and feedback with it, which is why it needs the confirmation.
