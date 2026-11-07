# 0106: Less on screen, and pages that fit it

Date: 2026-11-06

Replaces ADR 0105's monthly cost on Billing, ADR 0102's plan mix, ADR 0032's sponsor link on the billing page, and ADR 0091's tile for stopping. ADR 0100's sheet stays, and its rows lose their sentences.

## Decision

**A sentence only stays if the screen is wrong without it.** What a setting does waits behind a question mark, as a field's hint already does. Subtitles that repeat a page's title are gone.

**Billing shows what to do, not totals.** A Business's page is one row per Location, the next payment and a way to Stripe's portal. The monthly total and the plan mix are gone: neither helps anyone act, and a large total is the wrong thing to meet on a page people open to fix something.

**Leaving stays easy, and stops being advertised.** Stopping a plan and transferring a Business are quiet links, one step from done with a clear confirmation, rather than tiles or sections shown to everyone. The transfer link only appears once there's an Admin to give it to.

**Workflow, Settings and Feedback fit the window from 1024px.** The page doesn't scroll, its lists do, each inside its tile. Under 1024px tiles stack and the page scrolls.

**Inviting a business is a lime item in an Owner's sidebar,** opening a popup with how it works and the link. A Location on a trial, or with no plan, shows the plan card instead, as choosing a plan comes first. On a phone it's a button in the bar.

**The top bar's switchers are buttons:** a filled control with the name and chevrons inside, held down while open, at the size of a label.

## Why

Staff read these pages at a counter, and every sentence competes with what they came for. A hint someone needs is one click away, and everyone else no longer pays for it.

An Owner bringing another shop costs us nothing to acquire, so it deserves a place that's always in view rather than a tile on Billing, which people open rarely and for other reasons.

Hiding how to leave would be a dark pattern, and would make leaving angrier. The line here is that it's easy to find when wanted, and not put in front of people who aren't looking for it.
