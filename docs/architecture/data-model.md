# Data model

This is the reference for the schema in `packages/db/prisma/schema.prisma`. It explains what Prisma's own file can't: why each table, key, and index exists. Vocabulary follows `docs/domain/glossary.md`.

## Domain model

```
User (Better Auth)
 ├──< Membership >── Location ──> Business (owner: User)
 │                       │              │
 │                       │              └──< Location (1:N)
 │                       │
 │                       ├──< Customer
 │                       ├──< Invitation
 │                       ├──< Ticket >── Customer
 │                       │        │
 │                       │        ├──< TicketStatusEvent >── Status
 │                       │        └──> Workflow >──< WorkflowStep >── Status
 │                       │
 │                       └──> Subscription (1:1)
 │
 BusinessType ──< Workflow (default template)
             └──< BusinessTypeTranslation
 Status ──< StatusTranslation
```

`Business` and `User` (Better Auth's own tables) are the only entities not scoped to a single `Location`. Every other table carries `location_id` as its tenant boundary, enforced as a `NOT NULL` foreign key, not just an application-level filter.

## Primary key choices

- **UUID**: `Business`, `Location`. Low volume (thousands of rows even at scale), and the id is visible in dashboard URLs, a sequential id would leak how many businesses/locations exist.
- **BIGINT identity**: `Customer`, `Ticket`, `TicketStatusEvent`, `Workflow`, `Membership`. High-write or high-volume, internal-only (never exposed raw to a customer or in a public URL), sequential ids are faster to insert and index than UUIDv4.
- **SMALLINT identity**: `BusinessType`, `Status`. Tiny, developer-seeded reference tables.
- **Composite / shared PK**: `WorkflowStep` (`workflow_id, position`, no surrogate needed, it's a pure ordered join table), `Subscription` (`location_id` doubles as PK and FK, enforcing strict 1:1 without a redundant key).
- **UUID as token**: `Invitation.id` doubles as the accept-link token, unguessable is the actual requirement here, not sequential-insert performance.

## Access model

`Membership(user_id, location_id, role)` is the only access-control table. A `Business` owner gets an implicit `OWNER` membership row on every `Location` created under their business (kept in sync on ownership transfer), rather than a separate `Business.ownerId` check, so every authorization guard checks the same thing: "does this user have a membership at this location, and what role." See `docs/decisions/0002-location-scoped-membership.md`.

## Workflow versioning

A `Workflow` row is treated as **immutable once created**. Editing a location's custom workflow inserts a new `Workflow` + `WorkflowStep` rows and flips `is_active`, it never mutates existing `workflow_step` rows. A `Ticket` references a specific, frozen workflow version at creation time, so editing a workflow tomorrow can't retroactively change a ticket already in progress. `is_active` plus two partial unique indexes (one for business-type default templates, one for location custom workflows) resolve "what workflow does a brand-new ticket use."

## GDPR erasure

`Customer.deleted_at` is not a delete flag in the usual sense, `customer_id` on `Ticket` is `ON DELETE RESTRICT`, so the row can never actually disappear while a ticket references it. Erasure is an application-level transaction: overwrite `full_name`/`email` with redacted placeholders, set `deleted_at`. The ticket keeps a valid reference to "a customer existed," personal data is gone.

## Indexes

| Index | Columns | Supports |
|---|---|---|
| idx_location_business | business_id | List a business's locations |
| idx_membership_user | user_id | "Which locations can this user see", checked on nearly every request |
| membership unique | (user_id, location_id) | Permission check, prevents duplicate grants |
| idx_ticket_location_created | (location_id, created_at DESC) | Dashboard ticket list, most recent first |
| idx_ticket_location_status_created | (location_id, current_status_id, created_at DESC) | Dashboard filtered by status |
| ticket tracking_code unique | tracking_code | Public tracking page lookup, hottest single-row read in the app |
| idx_ticket_customer | customer_id | Customer detail page |
| idx_status_event_ticket_created | (ticket_id, created_at) | Ticket timeline / public tracking history |
| idx_customer_location_name | (location_id, full_name) | Customer search within a location |
| invitation partial unique | (location_id, lower(email)) WHERE status='PENDING' | Prevent duplicate pending invites |
| workflow partial unique (×2) | business_type_id / location_id WHERE is_active | Resolve the current workflow for a new ticket |

Deliberately not indexed: `customer.email` (no uniqueness requirement, low query frequency), `ticket.description` (free text, not searched in v1), `ticket_status_event.status_id` alone (always queried through `ticket_id`).

## Constraints Prisma can't express

Two things need a raw SQL migration on top of what `schema.prisma` generates, see `packages/db/prisma/migrations/0001_partial_indexes_and_checks/migration.sql`:

1. `CHECK ((business_type_id IS NOT NULL) <> (location_id IS NOT NULL))` on `workflow`, a workflow is either a business-type default template or a location's custom workflow, never both, never neither.
2. Three partial unique indexes (two on `workflow`, one on `invitation`), Prisma's schema language doesn't support filtered/partial unique indexes.

## Transactions

- **Status change**: update `ticket.current_status_id` + insert a `ticket_status_event` row, in one transaction, otherwise the denormalized field and the history can diverge.
- **Invitation acceptance**: conditional update (`WHERE status = 'PENDING'`), not read-then-write, so two concurrent accepts of the same link can't both succeed. The `Membership` unique constraint is the second safety net.
- **Workflow edit**: insert the new version, flip `is_active` on old and new, in one transaction, so there's never a moment with zero or two active workflows for that scope.
- **Stripe webhook processing**: idempotent via a small `processed_stripe_event(event_id PK)` table, checked in the same transaction as the subscription upsert, Stripe redelivers events and a duplicate write here would corrupt billing state.

## Pagination

`Ticket` and `TicketStatusEvent` lists use cursor pagination on `(created_at, id)` (id as tiebreaker for stable ordering), not `OFFSET`, both tables are expected to grow unbounded.

## Deliberately deferred

- **Row-Level Security**: application-level `location_id` scoping in the API service layer is sufficient with one trusted backend. RLS is real future hardening (defense-in-depth against an application bug), not a day-one requirement, and it adds real operational complexity with Prisma's connection pooling on Railway.
- **Partitioning**: `ticket_status_event` will be the fastest-growing table, worth partitioning by `created_at` range only if it reaches tens of millions of rows. Not before.
- **No `deleted_at` on `Ticket`**: it's a permanent business record, there's no deletion flow and none should exist. A considered omission, not an oversight.
- **No Postgres enum for `Status`/`BusinessType`**: both are extensible, translated catalogues the developer seeds over time, an enum would mean a schema migration every time a new one is added.
