# 0070: A ticket preview beside the Business form

Date: 2026-10-05

## Decision

Replaces the Workflow panel inside the Business form of ADR 0069.

On wide screens, the Business form has a preview beside it of the Customer's tracking page, filled in as the form is: the Business's avatar, the Location's name (the Business's until step 2 gives one), the Business type, the chosen type's default Workflow, and the Location's phone and contact email. The Workflow plays as ADR 0069 describes, its current Status as the ticket's title.

What a real Ticket would carry, like the item and the estimated ready date, and what the owner hasn't given yet, shows as still grey bars the size of the text they stand for, so the page keeps its shape. They don't pulse like a `Skeleton`, since nothing is loading.

The preview only repeats what's typed, so it's hidden from screen readers and inert. On narrow screens it isn't shown, so the form stays first.

## Why

A panel inside the form made it longer and showed one part of what the owner is setting up. Beside it, the owner sees what their customers will get from each answer as they give it, in the tracking page's own layout, without the form changing.
