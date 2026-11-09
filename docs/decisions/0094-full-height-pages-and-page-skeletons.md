# 0094: Full-height pages, page skeletons and the thank-you moment

Date: 2026-11-06

Replaces ADR 0091's Today thanks. The return from Checkout still lands on Today, for the same reason.

## Decision

**Every page fills the window.** A page's last tile or grid takes the height left, whatever the screen, and tiles that grow carry real content rather than blank space. The Location picker is wider than before, and keeps its tiles at their natural height since a picker with two Locations would otherwise show two huge tiles.

**Each page has its own skeleton**, drawn from its real tiles through `PageSkeleton`, so nothing moves when the data arrives.

**Pages stay in the router's memory for 30 seconds** (`staleTimes`). Nothing is kept in `localStorage` or IndexedDB. Your own changes still refresh at once, and a colleague's can take up to 30 seconds to show on a page revisited in that time.

**Paying is celebrated in a dialog** over Today: the plan's name, what it includes, the first payment date during a trial, falling confetti that stops for people who reduce motion, and one button. Stripe's return link carries the plan, as its webhook may not have arrived. Closing the dialog removes the parameters, so a refresh doesn't replay it.

## Why

Pages that stopped short left a band of canvas at the bottom, and one placeholder for every page looked like a different app loading. Shops share computers at the counter and Customer details are personal data, so they shouldn't outlive the tab, and a stale Status at a counter leads to real mistakes. Memory-only caching makes going back instant without either risk.

The plan in the link is only used for display, so changing it by hand fools nobody but the person doing it. A banner undersold the moment a shop decides to pay, where products like Linear and Shopify mark it.
