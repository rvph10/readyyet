# 0095: The tracking page as a bento

Date: 2026-11-06

## Decision

The tracking page follows ADR 0087's design. The Status comes first with a scene for what it means, the progress is the dashboard's `WorkflowTrack` with its pulsing current step, and the Location runs down the side. The page fills the window. On a phone it stays one column, with the Location raised right after the Status when the item is ready.

`WorkflowTrack` moves to shared components and can show when each step was reached. A stopped Ticket's track leaves out its CANCELLED or REJECTED step, which the Status already says, and stays still where it got to.

## Why

Customers should recognise the same product as the shop, and the page was the last one still in the earlier floating-panel style. The Status stays first as it's the reason the page is opened.
