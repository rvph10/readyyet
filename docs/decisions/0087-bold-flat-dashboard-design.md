# 0087: A bold, flat dashboard design

Date: 2026-11-05

Replaces the look set by ADR 0049, 0052 and 0061: their fonts, neutrals, panel depth, button sizes and Status pills. ADR 0048's accessibility rules and the lime `#D6FF53` still hold. ADR 0042's rule that lime marks READY still holds.

## Decision

Three rounds of an interactive prototype, reviewed by the product's owner, set these. They apply to the whole web app, through the same tokens.

**Flat, no shadows.** Surfaces separate by a hairline border or a fill. `--shadow-panel` and `--shadow-float` are gone.

**Colour.** Lime keeps its value and never carries text on white. Pine `#17423A` is the new action colour: primary buttons, the current navigation item, the current filter. Lime reads on pine at 9.7:1, so it appears there as the icon and the number. Neutrals move to a cool green-grey, with `ink` `#15211D` and `muted` `#4A5852`. `warning` joins `danger`, `success` and `info` for what waits on someone.

**Type.** Figtree alone, Inter is removed and Geist Mono stays for tracking codes. The named scale keeps its names with new values: page titles 32px bold, section titles 20px bold, body 15px, nothing under 14px. Real information is `ink`, `muted` only for what supports it.

**Status** is a tinted label with an icon, by tone, in place of a dot on a white pill. READY is the only lime.

**Shell.** A white sidebar, 256px, that collapses to an 80px rail with a button on its edge, the choice kept in a cookie so the server draws it right. Under 1280px it's always the rail, and on a phone a top bar and bottom navigation replace it. It carries no logo or product name, and the logo elsewhere moves to the lime token from its older `#C9E260`, on the sales site too, so the brand is one lime everywhere. The Location and the User are rows shaped like the navigation items, each opening a detailed panel. Counts are solid badges. New Ticket and one global search, which `/` reaches, sit in every page's header.

**Trial.** The sidebar's card says what's left and what it costs, and opens a plan chooser that goes to Stripe Checkout, Pro preselected, so it converts rather than only reminds. It turns red in the last 3 days.

**Ticket page.** The Status leads, with the Workflow as a track whose current step pulses in a loop, the only motion on the page. "Change Status" replaces the three dots, its menu in labelled sections, and ending a Ticket asks first. Editing opens a side panel, and the Status panel keeps its height, so nothing moves the page. The Ticket's id shows as `#4094`.

**New Ticket** is a side panel that ends on a large QR code, the moment a Customer at the counter needs it, so the `/tickets/new` page is gone.

## Why

The first version worked but felt cheap: every area was the same white panel, every row the same weight, and lime was almost absent from the shell. The owner's review asked for bold and spaced, and rejected shadows, faint secondary text, boring buttons and anything that shifts the layout. What they liked (the pine current item, the table with Customer avatars, the Status track) is what this keeps.

Changing token values rather than adding a second set means every page moves at once, the public tracking page and sign-in included, and there are never two design systems. That was accepted as a trade-off: those pages get the new fonts and colours without their own redesign.

Pine and not ink for actions, because lime on near-black reads as generic "dark and neon", where a deep green belongs to the same family as the lime.

A chooser in the sidebar, because a trial that ends without a plan freezes the Location (ADR 0031), and a reminder with no path to paying doesn't prevent that. The Billing page itself isn't built yet, so Stripe's return lands on the Location's home with a thank-you.
