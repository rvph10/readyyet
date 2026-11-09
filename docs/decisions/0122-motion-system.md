# 0122: One motion system for the dashboard

Date: 2026-11-09

## Decision

Motion marks the moments something opens, closes or changes. What is simply on the page stays still: no page transitions, no staggered entrances, no counting numbers, no hover lift.

**Tokens**, in `globals.css`: `--duration-quick` 150ms for hover, press and closing, `--duration-base` 200ms for menus and fades, `--duration-slow` 280ms for panels, sheets and heights. `--ease-enter` for what opens, `--ease-exit` for what closes, faster than it opened, and `--ease-move` for what goes from one place to another. Only opacity, transform and a grid's rows are animated, so nothing animates layout.

**Where it applies:**

- Menus, the select list and every popover from the bar or the sidebar fade and grow in from 97%, and leave the same way. A scale, not a slide, so it stays right when a popover flips to the other side of its trigger. On a phone, where they are bottom sheets, they rise from the bottom edge and the backdrop fades.
- Dialogs keep fading and scaling in from 95%, and now close the same way, still showing what they held while they fade. The side panel slides in from the right edge and back out, instead of zooming from the centre.
- Tooltips fade in after a short wait, so passing over a row of icons doesn't flash them.
- The sidebar's labels fade as it collapses or opens, instead of snapping. The setup guide folds and unfolds its height.
- A tile's placeholder crossfades into its content (ADR 0119), through `Reveal`, a Suspense whose fallback and content share one React `<ViewTransition>` name. The browser fades them as one picture, so what they have in common, the tile's frame, stays still. It doesn't play on a refresh, a filter or a form saving inside, only on the reveal. It also plays when the page first streams, the one exception to ADR 0048's "no page-load animation": it smooths a swap that already happens and adds no movement.
- The month chart's bars move to their new height when a refresh changes them, but don't grow in on load.

**Kept as they are:** the toasts' bounce and icon motion (ADR 0064), the pulsing Workflow step (ADR 0087), and buttons pressing in to 97%, which this records against ADR 0053's "nothing moves or scales".

**Reduced motion:** one rule in the base layer ends every transition and animation at once when the browser asks for it, behind each component's own `motion-safe:`.

## Why

Menus, panels and sheets appeared and vanished in a single frame, which reads as unfinished next to the toasts. ADRs 0048, 0049 and 0053 disagreed on what may move, and the code had grown about six durations and three easing curves of its own.

No animation library. The browser's popover and `<dialog>` animate both ways in CSS, with `@starting-style` and `transition-behavior: allow-discrete`, without JavaScript or re-renders. Libraries write `style` attributes when the server renders, which the CSP refuses (ADR 0048), the reason Sonner was rebuilt too (ADR 0060). A browser without `allow-discrete` just opens and closes at once, as before.

The tiles use React's own `<ViewTransition>`, the pattern Next.js documents for Suspense reveals, as a crossfade of matching pixels can't be done in CSS without touching each of the 137 placeholders. Once one is on the page React runs every navigation as a view transition, so the browser's whole-page crossfade is turned off: pages still change at once. A browser without view transitions shows the content at once.

A page transition would replay on every tab switch of a working screen that already draws at once, which makes it feel slower, not smoother.
