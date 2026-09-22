# 0007: Status catalogue and default workflows

Date: 2026-09-22

## Decision

Seed a 31-status catalogue (5 system: `RECEIVED`, `READY`, `COMPLETED`, `CANCELLED`, `REJECTED`; 26 operational) and 11 business types, each with exactly one deliberately shallow default workflow (2-4 operational steps). Full list in `docs/domain/status-catalogue.md`. `Customer` gains a `phone` field, nullable, never used by any automated system behavior (no SMS, per the original product spec, SMS cost was explicitly ruled out), contact info only.

Statuses that conceptually imply extra input (`QUOTE_PREPARED`, `APPROVED`, `AWAITING_CLIENT_INFO`) stay as pure labels in v1, no quote-amount storage, no structured info-request content. The status marks a point in the timeline; any actual quote or info exchange happens outside the system for now.

The five system statuses are plain seeded codes, not a schema-level flag (no `isTerminal`/`role` column), application code checks `status.code === 'READY'` etc. directly, consistent with how `BusinessType.code` is already used.

## Why

A larger catalogue than the original 10-status draft is what makes the paid custom-workflow tier (ADR 0003) actually worth paying for, a business needs real granularity to build from, not four extra words. Keeping each business type's *default* workflow shallow while the full catalogue stays large preserves that upgrade incentive: the free tier gets a working, realistic default; the paid tier gets genuine capability, not just more of the same words. Deferring quote/info-request features avoids building supporting infrastructure for functionality nobody has asked for yet, the status label alone still communicates real information to the client on the tracking page.
