# 0057: Fixes from a review of the base components

Date: 2026-09-28

## Decision

Changes ADR 0053's avatar colours and ADR 0056's busy button, and adds the states and variants the base components of ADR 0055 were missing.

**Readability.** Placeholders are `muted`, not `muted` at 70%. A select showing its empty "Choose one" option is `muted` like a placeholder, and its arrow turns over while the list is open. The list opens below the field and only flips above when it doesn't fit, with the pack's check beside the chosen option.

**Busy buttons.** A button waiting on its action takes a `pendingLabel` ("Saving…", "Sending the code…") in place of its label, on top of ADR 0056's busy pointer and blocked second click. Only the button whose action runs says so.

**New states and variants.**

| Component   | Adds                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `Button`    | `sm`, a 32px pill for the rows of a dense list                                                       |
| `Checkbox`  | `indeterminate`, an ink box with a dash, and `error`, a red outline with the message under the label |
| `FormAlert` | `tone`: `success` (ink check on `subtle`) and `info` (`muted` on `subtle`) beside the red `error`    |
| `InputOtp`  | `error`: red boxes and the message under them, used when the API refuses a code                      |
| `Tabs`      | A track tinted with ink at 6%, and sideways scrolling when the tabs outgrow the screen               |

A disabled checkbox is filled `canvas` with a `border-strong` outline at 60%, so it's still seen on white.

**Accessibility.** The dialog's close button is 44px like the other icon buttons. A tooltip flips above its trigger when there's no room below, and Escape hides it until the next hover or focus. A done workflow step says "done" to screen readers, and the current step's label is semibold.

**Avatars** use five tints, blue, indigo, teal, emerald and amber, instead of ADR 0053's eight.

## Why

Staff use the app at a counter, often on a tablet, so what only a mouse pointer shows doesn't reach them: a busy button that only changes the pointer looked the same as an idle one under a finger. The label swap says what's happening in words, which screen readers also read, and needs no motion, which ADR 0056 wanted to avoid.

Placeholders at 70% were 3.3:1 on white, too faint for a hint worth reading. `muted` is 6.6:1 and still reads as a hint next to `ink` values.

Chrome's customizable select opens its list on whichever side has more room by default, so a field in the lower half of the screen opened upward even with space below. Every menu the app draws opens below, so the list does too.

Success and info stay neutral so that colour keeps meaning either an error or a Status. The Status tones of ADR 0054 are cyan, violet, orange and pink, and ADR 0053's sky, orange, rose and pink avatars sat next to them in a Ticket row. They're dropped rather than swapped for others, since every remaining hue is taken by a Status, the lime or grey.

The tabs' track was `canvas`, which disappears on the canvas itself. A tint of ink shows on both white and grey. The rest follow WCAG: 1.4.13 for dismissing a tooltip, 2.5.5 for a 44px target, and 1.4.1 for not saying "done" with colour and a check alone.
