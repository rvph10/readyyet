# 0059: Panel, badge, search, radio cards, toast, menu, copy field and banner

Date: 2026-09-28

## Decision

Eight more base components in `web/src/components/ui/`, each on the browser's own elements where one exists:

| Component     | For                                                    | Built as                                                                                     |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Panel`       | The white layer on the canvas                          | A `div`, `section`, `aside` or `article`, `md` or `lg` padding                               |
| `Badge`       | A small label like an invitation's "Pending"           | Ink at 6% behind `muted` text, never coloured                                                |
| `SearchField` | Filtering a list, like Tickets by name or code         | A 44px pill `type="search"` with its own clear button, cleared by Escape too                 |
| `RadioCards`  | Choosing one of a few, like a Business type or a Role  | Native radios under cards, the chosen one with an ink outline and check                      |
| `Toast`       | Confirming what just happened, with at most one action | `useToast()` under `ToastProvider` in the root layout, a manual popover at the bottom centre |
| `Menu`        | A row's actions behind the three dots                  | A native `popover` placed by CSS anchor positioning, with arrow keys, Home and End           |
| `CopyField`   | A value to hand on, like a tracking link               | A read-only field with a Copy button that says "Copied" for 2 seconds                        |
| `Banner`      | A notice about the whole Business or Location          | Neutral on white, or red, with an optional link to where it's fixed, and no close button     |

A toast stays 5 seconds, 10 with an action like Undo, held while the pointer or focus is on it, and at most three show at once. Screen readers hear it from live regions that stay in the page, polite for success and info, assertive for an error.

## Why

The panel was written out by hand eleven times and the invitation's badge had colours of its own, so they drift. The rest are what the staff screens need next: the Ticket list's search and row actions, the choice of a Business type (whose hand-made radios used a lime ring), confirmations after an action, the tracking link, and billing notices per Location.

The Popover API and anchor positioning have been Baseline since Firefox 147 in January 2026, so the menu and toasts get light dismiss, Escape, focus return and the top layer without a dependency. Each menu's anchor name is set through the CSSOM, which the CSP of ADR 0048 allows where a style attribute isn't.

Toasts sit at the bottom centre, near the thumb on a tablet at the counter and clear of a page's header actions. Only an error is coloured, in toasts, banners and alerts alike, so colour keeps meaning an error or a Status. A banner is about something that must be fixed, like a failed payment, so it stays until it is instead of being dismissed and forgotten.
