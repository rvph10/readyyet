# 0067: Field hints as tooltips, the counter while typing, and an empty Location name

Date: 2026-10-05

## Decision

**Hints.** A field's `hint` moves from a line under the control to an info button beside its label, which shows the hint in a wrapping `Tooltip` on hover or keyboard focus. The hint stays the control's description through `aria-describedby`, and is also the button's name.

**Character counter.** Replaces the counter's rule in ADR 0066: the count of a field with a `maxLength` shows at the end of its label's row, from "0/100", while the field has focus, and is hidden otherwise. It takes no room of its own, so showing it moves nothing.

**The Location's name.** Replaces the prefill of ADR 0047: step 2 of the Business form starts with the Location's name empty and focused, with an example built from the Business's name as its placeholder ("e.g. Atelier Dupont Ixelles"). The Business's name has its own example, "e.g. Atelier Dupont", and each name has a hint saying which is the company and which the shop customers visit.

## Why

A Location prefilled with the Business's name read as the same field twice, and an owner with several shops could accept it without noticing that it names one shop, the name customers see on their tracking page. An empty field with an example made from their own name shows the difference without having to read anything.

Hint lines under every field made the form long and were read once at most. Behind an info button they're there for whoever wants them.

A counter only near the limit wasn't seen before it mattered. Shown while typing, it tells the limit from the first character, and stays out of the way of the fields not being filled in.
