# 0089: Our own date picker

Date: 2026-11-05

Replaces the browser's `<input type="date">` on the expected ready date. ADR 0055's other native controls stay.

## Decision

`DateField` is a button that looks like a field and opens a calendar in the browser's popover, anchored under it and flipping when there's no room. It's used in New Ticket and Edit Ticket. It shows six weeks from Monday, so its height never changes, marks today, greys out what can't be chosen, and ends with Clear and Today. The keyboard follows WAI-ARIA's date picker dialog.

It can't be typed into, so a half-typed date no longer exists and its error message is gone.

## Why

The browser draws its own calendar, which can't be styled, so it broke the dashboard's look at the moment staff use it most. It also differs per browser, and follows the browser's language rather than the page's.

No library: `react-day-picker` and the like are more than one calendar needs, and the popover, anchoring and focus return already come with the browser, as in `Menu`. The month maths is small and tested on its own.

Staff pick a date a few days ahead, so clicking beats typing at a counter. Phones lose their native wheel, in exchange for the same calendar everywhere.
