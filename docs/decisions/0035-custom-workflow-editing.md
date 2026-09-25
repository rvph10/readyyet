# 0035: Editing a custom Workflow

Date: 2026-09-25

Implements the custom Workflow of ADR 0003 and ADR 0031.

## Decision

- `PUT /locations/:locationId/workflow` takes the operational Statuses of the custom Workflow, in order. The API adds the five system Statuses around them, in the positions the seed uses: `RECEIVED` first, then `READY`, `COMPLETED`, `CANCELLED` and `REJECTED` after the operational ones. A system Status in the request is refused. An empty list is allowed, a Workflow that goes from `RECEIVED` to `READY`.
- Each edit inserts a new `Workflow` version and deactivates the previous one (`docs/architecture/data-model.md#workflow-versioning`). Tickets already open keep theirs.
- `DELETE /locations/:locationId/workflow` deactivates the custom Workflow, new Tickets use the Business type's default again.
- Both are for Owners and Admins, like a Location's other settings. Editing needs Pro, including during the trial, and is refused with `PLAN_REQUIRED` otherwise. Going back to the default works on every plan.

## Why

Every Workflow needs the five system Statuses: the status rules (ADR 0016), customer emails (ADR 0015) and the tracking page all rely on them. Letting the client send them would mean validating that each is present and placed sensibly. Adding them on the server makes a broken Workflow impossible to save, and leaves staff choosing only what's actually theirs to choose, the steps in between.

A custom Workflow has no name staff can set: a Location has one Workflow at a time and nobody picks it from a list.
