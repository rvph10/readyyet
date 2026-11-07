# 0053: Interaction states and default avatars

Date: 2026-09-28

## Decision

Replaces ADR 0049's hover and focus rules for buttons and inputs. Motion stays at ADR 0049's 200ms colour transitions, with nothing moving or scaling.

**States.** Every control changes visibly on hover, on press and on focus:

| Control         | Hover                                              | Pressed                | Focus                                |
| --------------- | -------------------------------------------------- | ---------------------- | ------------------------------------ |
| Primary button  | `ink` at 80%                                       | `ink` at 70%           | the global 2px `ink` outline         |
| Secondary button| `canvas` fill, `border-strong` outline, `ink` text | `border` fill          | the global 2px `ink` outline         |
| Lime button     | `brand-hover`                                      | 5% darker still        | the global 2px `ink` outline         |
| Link            | `ink` and underlined                               |                        | the global 2px `ink` outline         |
| Input           | `border-strong` outline                            |                        | `ink` border and a 3px `ink` ring at 10% |

A disabled input is filled `subtle` with `muted` text and doesn't react to hover. `border-strong` is darkened to `#A8ADA7` (ADR 0052) so the hover outline shows.

**Avatars.** A User without a picture gets their initials on a colour picked from their User id: an FNV-1a hash of the id, modulo a list of eight Tailwind pairs, each a 200 tint behind 900 text of the same hue (sky, blue, teal, emerald, amber, orange, rose, pink). The initials are the first letters of the first and last words of the name. The colour is computed wherever it's shown and never stored. `Avatar` in `web/src/components/ui/` takes five sizes, 24 to 80px, with the text at about 40% of the circle, semibold.

## Why

ADR 0049's hovers changed an outline by one step of a very light grey, or an ink button by 10%, which nobody could see. The app is used at a counter, often at arm's length, so a state that can't be seen is no state at all. Changes of fill and colour are enough to show it; movement is kept for the sales site.

Deriving the avatar colour from the id is what Slack, Notion and Google Workspace do: the same person has the same colour on every screen and device, it survives a change of name or email, and there's no column to fill, migrate or keep in sync. A tint behind deep text of the same hue passes WCAG AA at every size and stays soft next to the canvas. Lime and violet are left out so an avatar is never mistaken for a READY Status or an accent.
