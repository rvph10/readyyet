# 0054: Status colours and workflow steps

Date: 2026-09-28

## Decision

Replaces the colours of ADR 0042's six Status tones. Which Statuses belong to which tone is unchanged.

Each tone is a vivid fill with ink text and an ink dot on it, the same recipe as READY's lime:

| Tone      | Fill             | Statuses                                                                                                 |
| --------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Received  | `#2EE3F5` cyan   | `RECEIVED`, `INSPECTING`, `DIAGNOSING`, `QUOTE_PREPARED`                                                 |
| Working   | `#AD82FF` violet | `APPROVED`, `IN_PROGRESS` and every other work step                                                      |
| Waiting   | `#FFA228` orange | `AWAITING_APPROVAL`, `AWAITING_PARTS`, `PARTS_ORDERED`, `BACKORDERED`, `AWAITING_CLIENT_INFO`, `ON_HOLD` |
| Ready     | `brand` lime     | `READY`                                                                                                  |
| Completed | white, outlined  | `COMPLETED`, with `muted` text                                                                           |
| Stopped   | `#FF5C8D` pink   | `CANCELLED`, `REJECTED`                                                                                  |

`StatusPill` in `web/src/components/` takes a Status code and its translated label and picks the tone.

`WorkflowSteps` in the same folder shows where a Ticket stands, vertical in a narrow panel and horizontal across a wide one: done steps are ink circles with a check joined by ink lines, the current step is a circle in its tone with a soft ring of the same colour, and the rest are outlined circles on a grey line. A stopped Ticket's steps end at its CANCELLED or REJECTED.

## Why

The Tailwind pairs ADR 0042 picked were pale and alike, and the Received pill vanished on a grey row. Status is what staff scan a list for, so each tone has to be told apart at a glance, from across a counter. Vivid fills, a step short of fully saturated, put the Statuses in the same electric register as the lime instead of a borrowed pastel set. Cyan, violet, orange and pink sit far apart on the colour wheel and from the lime; violet was picked over blue for Working because blue sits too close to cyan. Ink on every fill is at least 6.4:1 (pink), past WCAG AA, and the fills stay too light for white text to work instead.

READY keeps the lime because it's the moment the product exists for, and COMPLETED stays neutral because nothing more is needed from anyone. Done steps are ink rather than their tone, so only the step that matters now carries colour.
