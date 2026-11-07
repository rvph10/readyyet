# 0052: Palette on a grey canvas

Date: 2026-09-28

## Decision

This replaces the neutrals, brand colours and `highlight` of ADR 0042. Its Status tones and rules about lime still hold.

The palette is built from four colours: ink `#091315`, lime `#D6FF53`, white `#FFFFFF` and the grey `#EBECEA`, which is the page background. White panels sit on the grey, and every other role is derived from those two.

| Token           | Value     | For                                         |
| --------------- | --------- | ------------------------------------------- |
| `canvas`        | `#EBECEA` | Page background                             |
| `surface`       | `#FFFFFF` | Cards, tables, dialogs, inputs              |
| `subtle`        | `#F5F6F4` | Hovered rows and fills inside a white panel |
| `border`        | `#DCDEDB` | Dividers and outlines                       |
| `border-strong` | `#A8ADA7` | Outlines of controls on hover (ADR 0053)    |
| `ink`           | `#091315` | Text, primary buttons, icons, focus         |
| `muted`         | `#56605D` | Secondary text                              |
| `brand`         | `#D6FF53` | Fills with ink on them                      |
| `brand-hover`   | `#BFE632` | The lime button on hover                    |
| `brand-text`    | `#4B6A00` | Links and lime-toned text                   |

`highlight` is removed. Keyboard focus (ADR 0048) and a focused input's border (ADR 0049) use `ink`.

## Why

The violet accent read as a generic app colour and fought the lime. Ink for focus is what Linear and Vercel do: the ring is 15.9:1 on the canvas, far clearer than any accent, and the lime stays the only colour on the page.

With a grey canvas, white becomes the lifted layer, so `subtle` has to sit between the two to still read as a fill on a panel, and `border` is darker than the canvas so outlines show on both. `muted`, `border` and `border-strong` lean toward the ink's green-grey instead of Tailwind's olive, which looked yellow next to it.

The new lime is 1.15:1 on white and 1.03:1 on the canvas, so it stays a fill under ink (16.4:1) and never text or a thin line. `brand-text` keeps its hue at a readable darkness. Every text pair passes WCAG AA, the lowest being `brand-text` on `canvas` at 5.3:1.
