# 0123: Numbers roll to their value

Date: 2026-11-09

Changes ADR 0122, which ruled out counting numbers.

## Decision

**The dashboard's big numbers roll like an odometer**: each digit is a strip of 0 to 9 that slides to its place. It rolls up from 0 the first time a number is drawn, and from its old digit when a refresh or an action changes it. Digits are matched by their place from the right, so 128 becoming 131 moves only the last two.

**Where**: Today's four hero numbers, the month tile's total, a Customer's Ready and In the shop numbers, and the open count on each shop of the picker. Not the counts in badges, tabs and tables, where a moving digit is noise next to the text it belongs to, and not dates or prices.

**How**: `RollingNumber`, in CSS only. The digit to show is a `data-d` attribute, each value a `translate` in `globals.css`, and `@starting-style` starts a new digit at 0. It needs no JavaScript, so it works in server components too. The strip shows a little above and below its line, under a fading mask, so digits slide in and out rather than being cut. A roll takes `--duration-count`, 900ms, eased to rest. Screen readers get the number once, as text. With reduced motion it shows its value at once.

## Why

The user asked for it after seeing the motion of ADR 0122, and chose rolling digits over a counter ticking through every value, and on load as well as on change. A roll moves only what changed, so a number that goes up by one doesn't redraw the whole figure.

NumberFlow, the library known for this, brings its own styles, which would have to get past the CSP (ADR 0048), the same trouble that had the toasts built here (ADR 0060). A strip per digit takes a few lines of CSS and needs no library or style attribute.
