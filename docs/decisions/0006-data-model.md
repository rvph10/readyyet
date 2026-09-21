# 0006: Core data model

Date: 2026-09-21

## Decision

Adopt the relational schema in `packages/db/prisma/schema.prisma`, documented in full in `docs/architecture/data-model.md`. Notable choices: UUID primary keys for low-volume, externally-visible entities (`Business`, `Location`), bigint identity for high-write internal-only tables (`Ticket`, `TicketStatusEvent`, `Customer`, `Membership`, `Workflow`); access control is a single `Membership(user, location, role)` table with no separate owner-only code path; workflows are immutable once created, edits create a new version rather than mutating in place; customer erasure is a redaction transaction, not a hard delete, since `Ticket.customer_id` must always resolve to a row.

## Why

The full reasoning for every table, index, and constraint lives in `docs/architecture/data-model.md`, that document is the source of truth going forward, this ADR just records that the schema was deliberately designed (query patterns, concurrency, tenant isolation, GDPR erasure, migration safety) rather than generated ad hoc from the entity list, and points at where to read why.
