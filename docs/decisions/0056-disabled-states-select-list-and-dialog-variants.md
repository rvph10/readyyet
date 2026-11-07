# 0056: Disabled states, select list and dialog variants

Date: 2026-09-28

## Decision

**Disabled and busy.** A disabled control shows the not-allowed pointer and keeps its look under it, with no hover change. A checked checkbox or switch that's disabled stays filled, in `muted` instead of `ink`, so it still reads as checked. A button waiting on its action (`pending`) blocks a second click and shows the progress pointer, with no spinner.

**Select list.** `SelectField` draws its open list like a menu, a white panel with `shadow-float` and a check next to the chosen option, through the browser's customizable `<select>` (`appearance: base-select`). A browser without it shows its own picker, with the field itself styled the same.

**Dialog variants**, one component with a `variant`:

| Variant        | For                             | Shape                                                             |
| -------------- | ------------------------------- | ----------------------------------------------------------------- |
| `default`      | Forms and questions             | Title and ink close button on top, content, actions at the end    |
| `destructive`  | Confirming what can't be undone | A red warning badge above the title, the action a `danger` button |
| `announcement` | What's new, offers, plan news   | A picture or a lime band on top, a larger title under it          |
| `image`        | A Ticket's photos               | The image alone on a darker backdrop, its title as the caption    |

`Button` gains `danger`, `red-700` with white text, for the one action a destructive dialog confirms.

## Why

A disabled button that still reacted to hover, or showed the ordinary pointer, looked clickable and broken. The not-allowed pointer is what browsers and operating systems use for it. The spinner read as generic and moved on a screen meant to stay calm; the busy pointer and the button that won't click twice say the same without motion.

A native `<select>` keeps the phone's picker, keyboard use and form behaviour, and the customizable select lets the list match the app where the browser supports it, without a dependency or a custom listbox to maintain. Browsers without it lose only the styled list.

The dialogs share their behaviour, and only their layout differs, so one component with variants avoids four copies of the focus and closing logic. The red badge and red button are there because a destructive action should never look like an ordinary one.
