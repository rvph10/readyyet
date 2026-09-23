# 0014: Ticket search, filters and cursor pagination

Date: 2026-09-23

## Decision

`GET /locations/:locationId/tickets` takes one free-text `q` plus filters, and returns `{ items, nextCursor }`.

- `q` is a case-insensitive substring match (Postgres `ILIKE`) on the ticket's title, description and tracking code, and the Customer's name, email and phone. `%` and `_` are escaped, they match themselves. An erased Customer's placeholder fields are not searched.
- Filters, all combinable with `q` and each other: `status` (one or more codes, repeated or comma-separated), `state` (`open` or `ended`, ended meaning `COMPLETED`/`CANCELLED`/`REJECTED`), `createdFrom`/`createdTo` (inclusive ISO timestamps), `createdBy` (a User id), `customerId`.
- Pagination is a cursor over `(createdAt, id)`, newest first, as `docs/architecture/data-model.md` specifies, replacing `skip`. The cursor is opaque to the client.

No search index is added. Every query is scoped to one Location, so it scans that Location's tickets only.

## Why

The dashboard has a single search box that should find a ticket by whatever the person at the counter has in front of them: a name, a phone number, a word from the job, or the code from the customer's email. A substring match covers all of those without asking the user which field they mean.

Substring `ILIKE` can't use a B-tree index. At the expected size of one Location (hundreds to low thousands of tickets) the scan is cheap. The proven next step if a Location grows into tens of thousands is Postgres's `pg_trgm` extension with GIN trigram indexes on the searched columns, a migration with no API change. Not worth the extension and write overhead before that.

Cursor pagination keeps pages stable while new tickets arrive (an `OFFSET` page shifts by one each time a ticket is created) and suits an infinite-scrolling list that reloads on every keystroke.
