# 0048: UI foundations

Date: 2026-09-27

## Decision

Every screen of the web app and the sales site is built from the same small set of sizes, on top of the palette of ADR 0042. Wherever Tailwind's defaults already give the value, pages use those utilities directly, no custom token.

Type, in Geist (ADR 0044), on Tailwind's size scale:

| Utility     | Size / line height | Weight   | For                                       |
| ----------- | ------------------ | -------- | ----------------------------------------- |
| `text-3xl`  | 30 / 36            | 600      | The Status headline on the tracking page  |
| `text-2xl`  | 24 / 32            | 600      | Page titles                               |
| `text-lg`   | 18 / 28            | 600      | Section titles                            |
| `text-base` | 16 / 24            | 400      | Tracking page body, every input on phones |
| `text-sm`   | 14 / 20            | 400, 500 | Dashboard body, table cells, buttons      |
| `text-xs`   | 12 / 16            | 500      | Labels, table headers, timestamps         |

- Headings from `text-2xl` up get a slight negative tracking (`tracking-tight`).
- Weights are 400, 500 and 600 only.
- Tables, dates and amounts use `tabular-nums`.
- A tracking code is set in `font-mono`.

Spacing is Tailwind's 4px unit, kept to eight steps: 1, 2, 3, 4, 6, 8, 12, 16 (4 to 64px).

| Where                 | Space                                      |
| --------------------- | ------------------------------------------ |
| Inside a control      | 8 to 12                                    |
| Card padding          | 16 on phones, 24 from `sm` up              |
| Related items         | 8 to 12                                    |
| Between groups        | 24                                         |
| Between page sections | 48                                         |
| Page side gutter      | 16 on phones, 24 on tablets, 32 on desktop |

Corners grow with the size of the element:

| Utility        | Radius | For                          |
| -------------- | ------ | ---------------------------- |
| `rounded-lg`   | 8px    | Buttons, inputs, small tiles |
| `rounded-xl`   | 12px   | Cards, tables, menus         |
| `rounded-2xl`  | 16px   | Dialogs and sheets           |
| `rounded-full` |        | Status pills, avatars        |

A rounded element inside another takes the outer radius minus the padding between them.

Depth has four levels:

| Level  | Look                                           |
| ------ | ---------------------------------------------- |
| Page   | `canvas`, no edge                              |
| Card   | `surface` with a `border`, no shadow           |
| Menu   | `surface`, `border` and `shadow-float`         |
| Dialog | `surface`, `shadow-overlay`, over `ink` at 40% |

Controls:

- Buttons are 40px high by default, 32px inside table rows, 48px for the main action on the tracking page and on phones.
- Five button styles: primary (`ink`), secondary (`surface` with a `border`), ghost, ready (`brand`, only for moving a Ticket to READY, per ADR 0042) and danger (`red-700` text).
- Nothing clickable is smaller than 24px; on touch screens the target is 44px.
- Keyboard focus is a 2px `highlight` outline, 2px off the element, set once in each app's `globals.css`.

Icons are Lucide, added to an app when its first icon is: 16px in text and buttons, 20px in navigation, Lucide's default stroke.

Motion is 150ms for hover and press and 200ms for menus and dialogs opening, eased out. No bounce, no page-load animation, and nothing moves when the browser asks for reduced motion.

## Why

A proposal was reviewed as a visual preview before being written down, with three alternatives for corners (6 / 8 / 12, 8 / 12 / 16, 10 / 16 / 20). The middle one was kept: it's Tailwind's own `lg`, `xl` and `2xl`, close to shadcn/ui's 10px default, and modern without looking soft. The logo tile is much rounder, which suits an app icon but not a table.

Tailwind's type and spacing scales match Radix Themes' almost step for step, so they're a known, balanced scale that needs no maintenance. The dashboard runs at 14px like Linear, Stripe and Vercel's dashboards, because staff scan lists of Tickets all day. The tracking page runs at 16px because a Customer reads it once, on a phone. Inputs stay at 16px on phones because iOS Safari zooms the whole page into any field smaller than that.

Borders for things on the page and shadows only for things floating above it keeps screens calm and makes a menu or dialog stand out when it matters. Tailwind's own shadows are pure black, which looks grey and dirty on the olive neutrals, so the two shadows are tinted toward the ink instead.

The 24px minimum is WCAG 2.2's target size at AA, 44px its AAA level and Apple's iOS guideline. The focus ring is violet because ADR 0042 reserves `highlight` for it, and setting it globally means no component can forget it.

Lucide is shadcn/ui's icon set, ISC licensed, and only the icons imported ship. The dashboard will need dozens, too many to draw by hand.
