# Data model

This is the reference for the schema in `packages/db/prisma/schema.prisma`. It explains what Prisma's own file can't: why each table, key, and index exists. Vocabulary follows `docs/domain/glossary.md`.

## Domain model

```
User (Better Auth)
 ├──< Session
 ├──< Account
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

Verification (Better Auth, standalone, no relation to User)
```

`Business` and `User` (Better Auth's own tables, along with `Session`/`Account`/`Verification`) are the only entities not scoped to a single `Location`. Every other table carries `location_id` as its tenant boundary, enforced as a `NOT NULL` foreign key, not just an application-level filter.

## Primary key choices

- **UUID**: `Business`, `Location`. Low volume (thousands of rows even at scale), and the id is visible in dashboard URLs, a sequential id would leak how many businesses/locations exist.
- **BIGINT identity**: `Customer`, `Ticket`, `TicketStatusEvent`, `Workflow`, `Membership`. High-write or high-volume, internal-only (never exposed raw to a customer or in a public URL), sequential ids are faster to insert and index than UUIDv4.
- **SMALLINT identity**: `BusinessType`, `Status`. Tiny, developer-seeded reference tables.
- **Composite / shared PK**: `WorkflowStep` (`workflow_id, position`, no surrogate needed, it's a pure ordered join table), `Subscription` (`location_id` doubles as PK and FK, enforcing strict 1:1 without a redundant key).
- **UUID as token**: `Invitation.id` doubles as the accept-link token, unguessable is the actual requirement here, not sequential-insert performance.
- **`User`, `Session`, `Account`, `Verification`**: Better Auth's own tables, shape and key types dictated by `better-auth generate` (see ADR 0008), not a choice made independently of the rest of this document's reasoning.

## Access model

`Membership(user_id, location_id, role)` is the only access-control table. A `Business` owner gets an implicit `OWNER` membership row on every `Location` created under their business (kept in sync on ownership transfer, ADR 0017), rather than a separate `Business.ownerId` check, so every authorization guard checks the same thing: "does this user have a membership at this location, and what role." See `docs/decisions/0002-location-scoped-membership.md`.

## Workflow versioning

A `Workflow` row is treated as **immutable once created**. Editing a location's custom workflow inserts a new `Workflow` + `WorkflowStep` rows and flips `is_active`, it never mutates existing `workflow_step` rows. A `Ticket` references a specific, frozen workflow version at creation time, so editing a workflow tomorrow can't retroactively change a ticket already in progress. `is_active` plus two partial unique indexes (one for business-type default templates, one for location custom workflows) resolve "what workflow does a brand-new ticket use."

## GDPR erasure

`Customer.deleted_at` is not a delete flag in the usual sense, `customer_id` on `Ticket` is `ON DELETE RESTRICT`, so the row can never actually disappear while a ticket references it. Erasure is an application-level transaction: overwrite `full_name`/`email`/`phone` with redacted placeholders, set `deleted_at`. The ticket keeps a valid reference to "a customer existed," personal data is gone.

## Deleted Locations

`Location.deleted_at` is a soft delete, final in v1 (ADR 0017). Nothing under a deleted Location is removed, tickets are permanent records. Instead every reader treats it as gone: `LocationMembershipGuard` answers 404 for it, `/me` leaves it out, the tracking page and the status email sweep skip it. Deleting also revokes its pending invitations and drops its queued status emails, in the same transaction.

## Tenant-scoped foreign keys

A single-column FK on `Ticket` (e.g. `customer_id -> Customer.id`) doesn't stop a ticket from referencing a customer that belongs to a _different_ location than the ticket itself, the FK only checks the row exists, not that it's the right tenant's row. This was caught in review (see `docs/decisions/` git history) and fixed with composite FKs:

- `Customer` has `@@unique([id, locationId])`, and `Ticket.customer` is a composite FK on `(customer_id, location_id) -> customer(id, location_id)`. A ticket's customer must belong to the ticket's own location, enforced by Postgres, not application code.
- `WorkflowStep` already had `@@unique([workflowId, statusId])`. `Ticket.currentStatusId` and `TicketStatusEvent.statusId` each get a composite FK against it: `(workflow_id, status_id) -> workflow_step(workflow_id, status_id)`. This closes a second gap, a ticket's current status (or a history event's status) had nothing stopping it from being a status that isn't even a step in that ticket's workflow. `TicketStatusEvent` carries a `workflow_id` column purely to make this composite FK possible, it's always equal to its parent ticket's `workflow_id` (workflows are frozen per ticket, see Workflow versioning above), a deliberate, cheap denormalization for a real integrity guarantee.
- That `workflow_id` copy on `TicketStatusEvent` created a third gap on its own: nothing tied it back to the _actual parent ticket's_ `workflow_id`, an event could carry a valid `(workflow_id, status_id)` pair that simply belonged to a different workflow than its own ticket's. Fixed with a second composite FK, `Ticket` gained `@@unique([id, workflowId])`, and `TicketStatusEvent.ticket` is now `(ticket_id, workflow_id) -> ticket(id, workflow_id)` instead of a plain `ticket_id -> ticket.id`. Both composite FKs on `TicketStatusEvent` are needed together, one pins `workflow_id` to the real parent ticket, the other pins `status_id` to a real step of that workflow.
- `Workflow`'s own tenant scoping (a ticket's workflow must belong to its location, or be a business-type default matching its location's business type) is **not** DB-enforced. A default workflow's `location_id` is intentionally `NULL`, shared across every location of that business type, so there's no single column pair a composite FK could pin to both cases. Enforcing this requires the ticket-creation transaction to explicitly validate the workflow (see Transactions below), a trigger could do it at the DB level but that's more machinery than this one invariant is worth.

## Membership invariants

`membership_one_owner_per_location` is a partial unique index: `(location_id) WHERE role = 'OWNER'`. It enforces _at most one_ owner membership per location. It cannot enforce _at least one_, that a location always has an owner membership the moment it's created, since a static constraint can't require a related row to exist. That half of the invariant (see `docs/decisions/0002-location-scoped-membership.md`) has to be the location-creation transaction's job, once the API that creates locations exists.

## Workflow content invariant

Every default `Workflow` the seed script creates includes all five system statuses (`RECEIVED`, `READY`, `COMPLETED`, `CANCELLED`, `REJECTED`) as steps, see `docs/domain/status-catalogue.md`. Like the two invariants above, this is enforced by the seed script's own logic, not by the database, `WorkflowStep` accepts any status code, nothing stops a future custom workflow from omitting one. Whatever code eventually builds custom workflows (paid tier, not yet built) must validate this before saving, alongside the tenant-scope validation already noted above. A `CHECK` constraint can't express "this workflow's steps include these 5 specific codes", that requires looking at other rows, which `CHECK` constraints in Postgres can't do.

## Pending status notifications

`pending_status_notification(status_event_id PK, send_after)` holds a customer status email waiting out the 2-minute undo window (ADR 0015, ADR 0016). Its FK to `ticket_status_event` is `ON DELETE CASCADE`: undoing a change deletes its event, which deletes the queued email with it, no application code needed. The sending sweep reads it through the `send_after` index.

## Indexes

| Index                              | Columns                                            | Supports                                                             |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| idx_location_business              | business_id                                        | List a business's locations                                          |
| idx_membership_user                | user_id                                            | "Which locations can this user see", checked on nearly every request |
| membership unique                  | (user_id, location_id)                             | Permission check, prevents duplicate grants                          |
| idx_ticket_location_created        | (location_id, created_at DESC)                     | Dashboard ticket list, most recent first                             |
| idx_ticket_location_status_created | (location_id, current_status_id, created_at DESC)  | Dashboard filtered by status                                         |
| ticket tracking_code unique        | tracking_code                                      | Public tracking page lookup, hottest single-row read in the app      |
| idx_ticket_customer                | customer_id                                        | Customer detail page                                                 |
| idx_status_event_ticket_created    | (ticket_id, created_at)                            | Ticket timeline / public tracking history                            |
| idx_customer_location_name         | (location_id, full_name)                           | Customer search within a location                                    |
| invitation partial unique          | (location_id, lower(email)) WHERE status='PENDING' | Prevent duplicate pending invites                                    |
| workflow partial unique (×2)       | business_type_id / location_id WHERE is_active     | Resolve the current workflow for a new ticket                        |

Deliberately not indexed: `customer.email` (no uniqueness requirement, low query frequency), `ticket.description` (free text, not searched in v1), `ticket_status_event.status_id` alone (always queried through `ticket_id`).

## Constraints Prisma can't express

A few things need a raw SQL migration on top of what `schema.prisma` generates, see `packages/db/prisma/migrations/`:

1. `CHECK ((business_type_id IS NOT NULL) <> (location_id IS NOT NULL))` on `workflow`, a workflow is either a business-type default template or a location's custom workflow, never both, never neither.
2. Four partial unique indexes (two on `workflow`, one on `invitation`, one on `membership`), Prisma's schema language doesn't support filtered/partial unique indexes.

Composite foreign keys (Tenant-scoped foreign keys, above) are expressible directly in `schema.prisma` via multi-field `@relation`, no raw SQL needed for those.

## Transactions

- **Ticket creation**: must validate the chosen workflow actually belongs to the ticket's location before insert, either `workflow.location_id = ticket.location_id` (custom workflow) or `workflow.location_id IS NULL AND workflow.business_type_id = location.business_type_id` (default template). Not DB-enforceable, see Tenant-scoped foreign keys above.
- **Status change**: update `ticket.current_status_id` + insert a `ticket_status_event` row, in one transaction, otherwise the denormalized field and the history can diverge.
- **Invitation acceptance**: conditional update (`WHERE status = 'PENDING'`), not read-then-write, so two concurrent accepts of the same link can't both succeed. The `Membership` unique constraint is the second safety net.
- **Workflow edit**: insert the new version, flip `is_active` on old and new, in one transaction, so there's never a moment with zero or two active workflows for that scope.
- **Stripe webhook processing**: idempotent via a small `processed_stripe_event(event_id PK)` table, checked in the same transaction as the subscription upsert, Stripe redelivers events and a duplicate write here would corrupt billing state.

## Pagination

`Ticket` and `TicketStatusEvent` lists use cursor pagination on `(created_at, id)` (id as tiebreaker for stable ordering), not `OFFSET`, both tables are expected to grow unbounded.

## Migration safety

`20260921200000_tenant_scoped_composite_fks/migration.sql` adds `ticket_status_event.workflow_id BIGINT NOT NULL` with no default and no backfill. That's only safe because every environment this schema has run in so far is empty (local dev, nothing has ever been deployed). This migration file is already applied locally and its checksum is tracked by Prisma, it must not be hand-edited after the fact. **Before this schema is ever migrated onto a database that already has `ticket_status_event` rows, this migration needs to be replaced with a backfill-then-`NOT NULL` sequence** (add the column nullable, `UPDATE ticket_status_event SET workflow_id = ticket.workflow_id FROM ticket WHERE ticket.id = ticket_status_event.ticket_id`, then `ALTER COLUMN workflow_id SET NOT NULL`), not deployed as-is.

## Tests

`packages/db/tests/schema-invariants.test.ts` exercises every constraint added above directly against a real Postgres instance (via `vitest`, run with `pnpm test` from `packages/db`): the workflow scope CHECK, the partial unique indexes, all composite FKs, and the owner-membership uniqueness, each proven to reject the bad case and one proven to accept a valid ticket. What isn't covered yet: anything requiring application code that doesn't exist (invitation-accept race handling, the ticket-creation workflow validation, owner-membership creation on location creation), those get tests once the service layer that implements them exists.

## Deliberately deferred

- **Row-Level Security**: application-level `location_id` scoping in the API service layer is sufficient with one trusted backend. RLS is real future hardening (defense-in-depth against an application bug), not a day-one requirement, and it adds real operational complexity with Prisma's connection pooling on Railway.
- **Partitioning**: `ticket_status_event` will be the fastest-growing table, worth partitioning by `created_at` range only if it reaches tens of millions of rows. Not before.
- **No `deleted_at` on `Ticket`**: it's a permanent business record, there's no deletion flow and none should exist. A considered omission, not an oversight.
- **No Postgres enum for `Status`/`BusinessType`**: both are extensible, translated catalogues the developer seeds over time, an enum would mean a schema migration every time a new one is added.
