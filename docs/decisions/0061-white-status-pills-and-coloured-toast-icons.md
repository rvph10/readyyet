# 0061: White Status pills and coloured toast icons

Date: 2026-09-28

## Decision

Replaces the Status colours of ADR 0054 and the toast icons of ADR 0060. Which Statuses belong to which tone is unchanged.

**Status pills** are white with a `border` outline and ink text, and only the dot carries the tone:

| Tone      | Pill                        | Dot              |
| --------- | --------------------------- | ---------------- |
| Received  | white                       | `#0AB8CC` cyan   |
| Working   | white                       | `#8A5CF6` violet |
| Waiting   | white                       | `#F08A00` orange |
| Ready     | `brand` lime fill           | ink              |
| Completed | `subtle`, with `muted` text | `muted`          |
| Stopped   | white                       | `#F0406E` pink   |

The current step of `WorkflowSteps` takes the same colours, with its ink dot and a ring of its tone.

**Toast icons** sit in a tint of their tone: an `emerald-700` check on `emerald-50` for success, a `blue-700` info on `blue-50`, and the red warning as before.

## Why

Six coloured fills made a list of Tickets loud, and every pill competed with the one that matters, READY. With white pills, READY is the only fill on the screen, which is what a counter clerk scans for, and the dots still sort the rest at a glance. COMPLETED on `subtle` with muted text reads as done and out of the way, where a white pill made it look like any other.

The dots don't need to pass a contrast ratio on their own, since the label beside each one names the Status. On the workflow marker, ink on each tone is at least 4.4:1.

A colour on each toast's icon says what kind of news it is before it's read. Emerald and blue are kept to those small icons, away from the Status tones.
