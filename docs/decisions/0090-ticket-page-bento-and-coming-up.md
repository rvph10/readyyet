# 0090: The Ticket page as a bento, and Coming up on Today

Date: 2026-11-06

Replaces the Ticket page's two columns of ADR 0087 and the "Tickets by step" tile of ADR 0088.

## Decision

**The Ticket page is one four-column grid.** Status takes three columns beside the Customer. Under them, Details and Photos take two columns, beside History and Tracking running the height of both.

**Long lists scroll inside their tile:** a Ticket's History, and Needs you on Today. They take the height the row gives them, so a busy day doesn't stretch the page or break the proportions.

**Coming up replaces Tickets by step.** It lists today and the next four days with the Customers expecting their item. The `steps` of the overview route stay, the table's filters count from them.

**Words and small things.** A moment reads "Today at 16:28" and "5 Nov at 16:28". A table's date cell is always one line, the date itself on hover. `CopyField` is a value on a soft fill with a round button that turns lime with a check. The week's change is a solid badge beside its number, lime when it's up. The collapsed sidebar's items are circles.

## Why

The owner's review found the two columns gave everything the same scale. Scrolling inside a tile goes against the usual one-scroll rule, but only a list that grows without limit does it, and it's what keeps a bento's rows even.

Counts per step told a shop nothing it could act on, and a bar chart of small numbers looks like a report. Who's expecting what, and when, is what the person at the bench plans around, and it needs no new data, as the overview already holds the open Tickets.
