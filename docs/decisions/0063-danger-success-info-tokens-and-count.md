# 0063: Danger, success and info tokens, and the count

Date: 2026-09-28

## Decision

Adds to the palette of ADR 0052 and replaces the count of ADR 0049.

**Tokens.** Every colour in the web app now comes from the palette. The reds and the toast icons' green and blue, written until now as Tailwind colours in each component, become tokens with the same values:

| Token            | Value     | For                                                       |
| ---------------- | --------- | --------------------------------------------------------- |
| `danger`         | `#C10007` | Error text, icons and outlines, the `danger` button       |
| `danger-hover`   | `#9F0712` | The `danger` button on hover                              |
| `danger-active`  | `#82181A` | The `danger` button pressed                               |
| `danger-subtle`  | `#FEF2F2` | Behind an error: the alert, the banner, the dialog's icon |
| `success`        | `#007A55` | A toast's success icon                                    |
| `success-subtle` | `#ECFDF5` | Behind it                                                 |
| `info`           | `#1447E6` | A toast's info icon                                       |
| `info-subtle`    | `#EFF6FF` | Behind it                                                 |

The sign-in panel's `#F7F7F7` becomes `subtle`. Avatars keep their Tailwind tints (ADR 0058): they tell people apart and have no role to name.

**Count.** No outline: a soft fill of ink at 8% behind `muted` text, and on the current tab a `brand` lime fill behind ink.

## Why

The same red was written out in more than a dozen places, with two darker shades for the button's states. Named once, it can't drift, and a change reaches every error at once.

The outlined count looked like a form control. A soft fill reads as a label. Lime on the current tab's count is the one use of lime beyond READY, kept small: it marks the number of what's on the screen, the same "this is it" that READY says.
