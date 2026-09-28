# 0055: Icon script and base components

Date: 2026-09-28

## Decision

**Icons.** The Be Bold pack stays out of the repository. `pnpm icon list [search]` shows the pack's icons and which are already in, and `pnpm icon add <name>...` copies icons into `web/src/components/ui/icon.tsx` in alphabetical order, keeping only their shapes and formatting the file with Prettier. It reads the pack from `BE_BOLD_SVG_DIR` in `web/.env.local`, so each developer points it at their own copy.

**Base components** in `web/src/components/ui/`, each built on the browser's own element so forms, keyboards and screen readers work without extra code:

- `Field`, `TextareaField` and `SelectField` share a label, the states of ADR 0053 and an error under the control. The textarea grows with its text up to 240px. The select is a native `<select>`, so phones open their own picker.
- `Checkbox` and `Switch` are native checkboxes drawn over, the switch with `role="switch"`, its label first and the control at the end of the row, for settings that apply at once.
- `Tabs` are links on a `canvas` track, so the chosen view is in the URL. `Count` is the outlined chip next to a heading or tab.
- `ProgressBar` is a restyled `<progress>`: a width set per render would need an inline style, which the CSP refuses.
- `Skeleton` is a block of ink at 10%, darker than whatever it sits on.
- `EmptyState` says what would be in an empty list and offers the action that fills it.
- `Dialog` is a modal `<dialog>`, which traps focus, closes on Escape and makes the page behind it inert, closing on a click on the backdrop too. Its variants are in ADR 0056.

## Why

The pack was bought for use in the product, not to be shared, and this repository is public, so it only holds the icons the app shows. A script makes adding one a single command instead of copying paths by hand, which is what kept the set small and made each addition slow.

Native elements bring focus handling, keyboard support and accessibility that a custom build would have to rewrite and could get wrong, the same reason `InputOtp` wraps a single input. No dependency was needed for any of these.
