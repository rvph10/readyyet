# 0068: A field's hint inside the control

Date: 2026-10-05

## Decision

Replaces where ADR 0067 put a field's hint button: it sits inside the control, at the end of its first line, as a question mark in a circle, and the control leaves room for it. Its target is 44px, like the other icon buttons (ADR 0057), and its tooltip lines up with the control's end rather than centring under it. The pointer stays the default arrow over it, since it only shows a tooltip.

## Why

Beside the label, the hint button read as part of the label's text. Inside the control, a question mark is where people look for help on a field in other apps, and it keeps the label row for the label and the character count.
