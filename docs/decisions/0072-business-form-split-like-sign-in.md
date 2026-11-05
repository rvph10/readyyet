# 0072: The Business form split like the sign-in page

Date: 2026-10-05

## Decision

Replaces the layout of ADR 0070, whose ticket preview stays as it was.

The Business form has its own layout, out of the dashboard's, split like the sign-in page (ADR 0046): on wide screens, a white panel the full height of the page on one side, with a heading ("What your customers will see"), a line on what it shows, and the ticket preview on its grey page under them; the header and the form on the canvas on the other side, without a card around the form. Both sides start at the same height, the form's title level with the panel's heading, and anything that grows, like a longer Workflow, grows downward. The preview has no frame or border of its own.

On narrow screens the panel isn't shown, as on the sign-in page.

## Why

Side by side as two boxes of their own, the form and the preview had different heights, and the preview's frame put borders inside borders. The sign-in page's split is already the app's layout for a page with one thing to do and something to look at beside it: both halves are always the page's height, and the first pages a new owner sees read as one.
