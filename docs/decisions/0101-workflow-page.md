# 0101: The Workflow page

Date: 2026-11-06

Builds the screen for ADR 0035's custom Workflow. The API needed no change.

## Decision

`/locations/:locationId/workflow` is for Owners and Admins, and a 404 for an Employee, like the rest of what the navigation calls Manage.

**It shows the path a Ticket follows,** with the same round marks as a Ticket's track: `RECEIVED` fixed at the top, the shop's own steps, then `READY` and `COMPLETED` fixed at the bottom, with a line saying a Ticket can be cancelled or rejected at any step. A second tile lists the steps that can be added, by kind and searchable. Steps that email the Customer say so where they're chosen, as that's what a shop can't otherwise guess.

**Steps move by dragging, or with up and down buttons.** Native drag and drop needs no dependency, and the buttons are what touch screens and keyboards use. Nothing is saved until Save, and the bar beside it says that Tickets already open keep the Workflow they started with.

**Going back to the default** appears only once the saved steps differ from the Business type's, found by comparing them with the catalogue rather than by the Workflow's name. It lists what the default holds before confirming.

**Without Pro the path is read-only,** and a lime tile says a custom Workflow comes with Pro and leads to Billing. A frozen Location that kept `PRO` can still edit, as ADR 0035 decided.

## Why

A list of steps says little by itself, while a path says what a Ticket will do, and it's the picture staff and Customers already know from the Ticket and tracking pages.

Saving makes a new version (ADR 0035), so it's one deliberate action rather than one per click, which would fill the table with versions while someone rearranges a list.
