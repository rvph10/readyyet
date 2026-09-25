# 0042: Colour palette

Date: 2026-09-25

## Decision

A light design, built from the logo's two colours: lime `#C9E260` and ink `#1E1E1E`.

Pages use colours by role, the tokens in each app's `globals.css`:

| Token        | Value     | Source          | For                                                  |
| ------------ | --------- | --------------- | ---------------------------------------------------- |
| `canvas`     | `#FBFBF9` | Tailwind olive-50  | Page background                                   |
| `surface`    | `#FFFFFF` |                 | Cards, tables, dialogs                               |
| `subtle`     | `#F4F4F0` | Tailwind olive-100 | Hovered rows, code boxes, inputs at rest          |
| `border`     | `#E8E8E3` | Tailwind olive-200 | Dividers and outlines                             |
| `ink`        | `#1E1E1E` | logo            | Text, primary buttons, icons                         |
| `muted`      | `#5B5B4B` | Tailwind olive-600 | Secondary text                                    |
| `brand`      | `#C9E260` | logo            | Fills: READY, key highlights, one accent button      |
| `brand-text` | `#556E18` | lime-700 below  | Links and lime-toned text                            |
| `highlight`  | `#7F22FE` | Tailwind violet-600 | Focus rings, the Pro plan, rare marketing accents |

The brand lime scale, the logo colour at 300, every step at its hue (118.9 in OKLCH): 50 `#F8FEE6`, 100 `#EFFBCB`, 200 `#E2F6A0`, 300 `#C9E260`, 400 `#B3CB47`, 500 `#95AB2A`, 600 `#6E8D25`, 700 `#556E18`, 800 `#415511`, 900 `#34440E`, 950 `#1D2904`. A step becomes a token when a page first needs it.

Ticket Statuses are shown in six tones, a Tailwind background and text pair each:

| Tone       | Statuses                                                                                      | Colours                 |
| ---------- | --------------------------------------------------------------------------------------------- | ----------------------- |
| Received   | `RECEIVED`, `INSPECTING`, `DIAGNOSING`, `QUOTE_PREPARED`                                      | olive-700 on olive-100  |
| Working    | `APPROVED`, `IN_PROGRESS` and every other work step                                           | blue-700 on blue-50     |
| Waiting    | `AWAITING_APPROVAL`, `AWAITING_PARTS`, `PARTS_ORDERED`, `BACKORDERED`, `AWAITING_CLIENT_INFO`, `ON_HOLD` | amber-800 on amber-50 |
| Ready      | `READY`                                                                                       | ink on brand            |
| Completed  | `COMPLETED`                                                                                   | muted on surface, outlined with border |
| Stopped    | `CANCELLED`, `REJECTED`                                                                       | red-700 on red-50       |

Rules:

- Lime is a fill with ink on it, never text or a thin line on white. Lime-toned text uses `brand-text`.
- One ink button per screen for its main action. The lime button is kept for moving a Ticket to READY.
- Violet stays rare, and never sits next to lime at the same size.
- Most of every screen is canvas, surface and border. Colour marks state and action.

## Why

The logo's lime is 1.45:1 against white, far below the 4.5:1 WCAG AA asks of text, while ink on it is 11.5:1. So the lime can carry weight as a fill and never as text, and everything else follows from that.

The neutrals are Tailwind's olive scale, a grey with a trace of the lime's hue, the pairing Radix Colors recommends for lime. It reads warmer and more intentional next to the brand than the cool zinc the scaffold started with. Violet sits almost opposite lime on the colour wheel, a second accent that stands out without competing, as long as it stays rare. The Status tones reuse Tailwind's own scales rather than inventing new ones.

Lime is kept for READY because that's the moment the product exists for, the one a Customer is waiting to see. Every pair in the tables above passes WCAG AA, the lowest being `brand-text` on `canvas` at 5.6:1.

Tokens are named by role, the way shadcn/ui names its theme colours, so a colour can be tuned in one place and pages don't depend on raw scale steps.
