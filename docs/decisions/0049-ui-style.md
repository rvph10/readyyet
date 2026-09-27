# 0049: UI style, floating panels and rounded controls

Date: 2026-09-27

## Decision

Replaces ADR 0048's type, corners, depth and controls, and the fonts of ADR 0044. ADR 0048's spacing scale, touch targets and icon library still apply. The palette of ADR 0042 is unchanged, so are its rules: lime is a fill for READY, ink carries the main action, violet marks focus.

**Fonts**, the same in the web app and the sales site, all from Google Fonts through `next/font`:

- Figtree (`font-sans`) for all text.
- Inter (`font-display`) for large titles, with its optical size axis so large text uses its display cut.
- Geist Mono (`font-mono`) for tracking codes.

**Type** is a named scale in `globals.css`, each step setting size, line height, letter spacing and weight together:

| Utility            | Size / line height | Weight | For                                             |
| ------------------ | ------------------ | ------ | ----------------------------------------------- |
| `text-title-h1`    | 64 / 70            | 700    | The headline on the sign-in picture             |
| `text-title-h3`    | 40 / 48            | 500    | The sign-in picture's headline on smaller screens     |
| `text-title-h4`    | 32 / 40            | 500    | Sign-in form headings, in `font-display`        |
| `text-title-h5`    | 28 / 42            | 700    | Large figures, the code boxes                   |
| `text-title-h6`    | 20 / 30            | 500    | Subtitles under a large heading                 |
| `text-label-xl`    | 24 / 32            | 500    | Page titles in the dashboard                    |
| `text-label-lg`    | 18 / 27            | 500    | Card and section titles                         |
| `text-label-md`    | 16 / 24            | 500    | Inputs, prominent labels, page subtitles        |
| `text-label-sm`    | 14 / 20            | 500    | Buttons, navigation, table cells                |
| `text-label-xs`    | 12 / 16            | 500    | Group labels, chips, timestamps                 |
| `text-p-lg`        | 18 / 24            | 400    | Lead text                                       |
| `text-p-md`        | 16 / 24            | 400    | Tracking page body                              |
| `text-p-sm`        | 14 / 21            | 400    | Body text, the default                          |
| `text-p-xs`        | 12 / 16            | 400    | Fine print                                      |

Headings are medium (500) rather than bold, and the larger steps are slightly tightened.

**Layout.** The page is `canvas`, and each area of a screen is a floating `surface` panel set 20px (`p-5`) from the window's edges and from each other: `rounded-3xl`, no border, and `shadow-panel`. The dashboard has a 320px navigation panel and a main panel. A page's title (`text-label-xl`) and subtitle (`text-label-md text-muted`) sit above its main panel, on the canvas, with the page's actions to their right. Under 1024px the navigation panel becomes a drawer, and on phones the panels run edge to edge.

**Big displays.** From 1900px wide, the root font size grows with the window (`calc(0.7rem + 0.28vw)`, then `0.32vw` from 2150px, `0.35vw` from 2300px), so the whole interface, which is sized in rem, scales up on 2K and 4K screens instead of shrinking into the middle.

**Corners**, larger for larger things:

| Radius         | For                                                        |
| -------------- | ---------------------------------------------------------- |
| `rounded-full` | Buttons, icon buttons, Status pills, tabs, switches        |
| `rounded-3xl`  | Panels                                                     |
| `rounded-2xl`  | Dialogs, list rows, cards over a picture                   |
| `rounded-xl`   | Inputs, cards, menus, navigation items                     |
| `rounded-lg`   | Small inputs, small tiles                                  |

**Controls:**

- Buttons are pills 44px high (`h-11`), with `text-label-sm`. Primary is `ink` with `surface` text, secondary is `surface` with a `border` outline and `muted` text that turn `border-strong` and `ink` on hover. Icon buttons are 44px circles.
- On the sign-in page, the full-width button and the inputs are 48px (`h-12`) with `rounded-xl`, so the form reads as one block.
- Inputs are 48px, `rounded-xl`, a `border` outline and `text-label-md`. A small variant is 36px, `rounded-lg`, `text-label-sm`, for filters and dense forms. A focused input turns its border `highlight`.
- Forms show their own errors, not the browser's: they set `noValidate`, check each field on submit with the browser's own constraints (`required`, `type`, `pattern`), and show the first problem under the field in `red-700`, with the field's border red and the cursor moved to it. While an error shows, the field is checked again as it's typed, so the message goes as soon as the value is right. A refusal from the API about a field shows there too. An error about the whole form (the API unreachable, too many attempts) shows at the top of its fields, in a light red box with an icon, so it can't be read as belonging to the field above it.
- `Button`, `Field`, `FormAlert` and `Tooltip` in `web/src/components/ui/` carry these rules, so pages use them rather than restyling a `<button>` or `<input>`.
- Navigation items are 40px, `rounded-xl`, an icon and `text-label-sm`. The current page is `ink` on `subtle`, the others `muted`. Groups are headed by a `text-label-xs text-muted` label.
- List rows are `subtle` blocks, `rounded-2xl`, with their icon in a `surface` tile. Cards are `surface` with a `border`, `rounded-xl`.
- Tabs are a `subtle` pill track with a `surface` pill under the current tab.
- Counts next to a heading are small outlined chips.

**Depth.** Panels float on `shadow-panel`, a shadow so faint it only lifts them off the canvas. Menus take `shadow-float` and a `border`. Dialogs are `rounded-2xl` panels over the page dimmed and blurred (`ink` at 24%, `backdrop-blur-sm`), with a round `ink` close button.

**Motion.** 200ms by default for every transition. Menus scale in from 95% while fading. Reduced motion is still respected (ADR 0048).

**Icons** are Lucide with a 1.5 stroke, 20px in navigation and icon buttons, 16px to 18px inside text and buttons.

## Why

The Balanced corners and flat, bordered cards of ADR 0048 read as a generic dashboard. Floating panels, pill buttons and generous corners give the product a softer, more distinctive and more modern look, one that has proven itself in polished SaaS products, while ADR 0042's palette keeps it recognisably ReadyYet.

Figtree is a free, open-licensed geometric sans with the same friendly, rounded character as the commercial fonts this style usually uses, and it's on Google Fonts, so it loads through `next/font` like Geist did, with no font file to license or host. Satoshi was considered and rejected: its licence forbids putting the font file in a public repository, which this one is. Inter's display cut keeps large headings tight and crisp, which Figtree alone doesn't at 40px and above.

Naming each step of the type scale by its role (`label`, `p`, `title`) bundles size, line height and weight, so a label can't end up with body text's weight by accident, the same approach as established design systems like AlignUI and Vercel's Geist.

Most screens will be used on laptops and desktop monitors at a shop's counter. Without scaling, a 4K monitor shows the app as a small island in the middle; scaling the root font size keeps it comfortable without a second set of layouts.

The browser's validation bubbles follow the browser's language rather than the page's, can't be styled, look different in every browser and vanish after a few seconds. Keeping its constraint checks and only drawing the messages ourselves costs no library and keeps the right keyboard on phones.

`border-strong` is Tailwind's olive-300, the next step of ADR 0042's neutral scale, added because outlined controls need a darker outline on hover than `border` gives.
