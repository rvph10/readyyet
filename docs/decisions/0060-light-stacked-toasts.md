# 0060: Light, stacked toasts

Date: 2026-09-28

## Decision

Replaces the look, timing and stacking of ADR 0059's toasts. Their place at the bottom centre, their one optional action and their live regions stay.

- **Look.** A white card with a `border` outline and `shadow-float`, the tone in a round badge on the left: an ink check for success, a `muted` info on `subtle`, a red warning on `red-50`. The action is a small ink button.
- **Stack.** The newest toast is in front. Up to two older ones peek above it, each 10px higher and 5% smaller, cut to the front toast's height with their text hidden. While the pointer or focus is on the stack it opens, every toast at its own height 8px apart, and every timer holds.
- **Timing.** 4 seconds for success and info, 7 for an error, 10 with an action. A timer keeps what's left of its time while the stack is open.
- **Built here, not with Sonner.** Sonner is where this stack comes from, but it places each toast with a `style` attribute, which the CSP of ADR 0048 refuses in production. Positions are set through the CSSOM instead, as the menu's anchor is.

## Why

The dark toasts stood out against a page that's white and grey everywhere else. A white card lifted by the same shadow as a menu reads as part of the app, and the tone badge carries the meaning where the dark fill did.

Replacing toasts, or stacking them in a tall column, either loses a message or covers the page. The fanned stack, from Sonner, keeps the latest one readable, shows at a glance that there are more, and opens only when someone reaches for it, which is also when they're reading, so nothing times out under them. Errors stay longer because they need reading, not just noticing.
