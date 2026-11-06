# 0105: A Business's home is its Locations

Date: 2026-11-06

Replaces ADR 0102's overview and ADR 0103's separate Locations page. Its Team, Billing and Settings stay, and so does ADR 0104's one Business at a time.

## Decision

**A Business has four tabs: Locations, Team, Billing and Settings.** `/businesses/:id` is Locations, the picker's tiles with the plan of each in place of the Role. An Owner reaches it from `/`, which now redirects there, so the picker is only for people who don't own the Business they're looking at.

**There are no numbers across Locations.** The week's chart, the tiles for ready, late and open, the Locations table and the Needs you list are gone. The monthly cost is on Billing.

**One banner stays,** for what stops a shop: a Location that can't take new Tickets, or a failed payment. It leads to Billing, and each tile's plan says which one. Late Tickets are on the tiles.

**`/businesses/:id/team` lists each person once,** with where they work and in which Role, and the invitations waiting for an answer. An invitation can go to several Locations, one call each, and says which were refused. A Location with no plan or no place left can't be ticked. Changing someone stays on that Location's Team page, which each place links to. A Membership stays per Location (ADR 0002).

**The top bar is bolder:** taller, with the names at heading size.

## Why

A total across shops doesn't lead anywhere. Three late Tickets across a chain only raises the question of which shop, and they're fixed in that shop, whose Today already says so. The rule for a stat here is that a shop can act on it, and the Location tiles do that while the totals don't. It's also how Supabase's organisation opens, on its projects. Totals can come back if chains ask for them.

The picker and the overview answered the same question for an Owner, where to go next, so keeping both meant two pages to maintain and one extra step. Reading the plan on the tile shows the one thing that's the Business's alone.
