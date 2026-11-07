# 0102: The Business pages

Date: 2026-11-06

Replaces ADR 0091's "`/businesses/:id/billing` redirects to the first of the Business's Locations" and ADR 0092's Settings link beside a Business's name, which now goes to `/businesses/:id/settings`. ADR 0100's single sheet and ADR 0087's bento still apply to a Location's pages.

## Decision

**A Business has its own shell, for its Owner alone.** The routes moved to the `(business)` group, with the same sidebar as a Location, now in `components/sidebar.tsx`. It holds Overview, Billing and Settings, then each Location as a direct link and Add a Location. There's no Locations page: it would repeat Overview's table.

**These pages are account pages, not a shop's working pages.** Each opens on one pine hero, with smaller tiles beside it, then a table with a narrower column next to it. A tile's inset footer says what its figure can't by itself. Tables have a filled header band and no row dividers. Lime and red still mean something to act on. The polish follows UI8's PayPilot kit, kept to ADR 0087's flat surfaces, where its shadows and blue don't apply.

- `/businesses/:id` greets the Owner, with Tickets handed over this week across Locations as the hero, using the Location's own chart, then ready, late, open and the monthly cost, a Locations table, and a Needs you list leading to where each thing gets fixed, money first.
- `/businesses/:id/billing` has the monthly cost as its hero, over a bar with one mark per Location showing the plan mix, then the next payment and one row per Location with the action its state calls for. Cards and invoices stay in Stripe's portal, and the sponsor link is here, as ADR 0032 says.
- `/businesses/:id/locations/new` is one page with the tracking preview beside it, not the first Business's two steps. It says a plan is needed, and goes straight to the new Location's billing page, as a later Location has no trial (ADR 0082).
- `/businesses/:id/settings` holds the name, the logo, and transferring ownership to an Admin of one of its Locations.

**No API changes.** An Owner has an OWNER Membership on every Location, so the pages read the Location routes, several calls per Location in parallel. As on the picker, a Location whose Tickets fail to load shows without numbers. Billing that fails to load is an error, as a wrong total is worse than none.

**The monthly cost uses list prices**, a yearly plan counted by the month, and says so, as `BillingDto` carries no invoice amounts (ADR 0091). A failed payment still counts in it, but isn't the next payment, as Stripe retries on a date the API doesn't give.

**The plan mix is an ordered scale of the one lime**, stepping down towards the pine it sits on, as a trial or a stopped Location isn't paying yet. A legend gives each step in words with its count.

**Stripe's portal is offered once a Location has had a plan,** ended ones included, for their invoices. The API refuses it to a Business that never paid.

## Why

These pages were placeholders, so a second Location couldn't be added from the app, and an Owner had no view across their shops. A shop's working pages are built around one day at the counter. An Owner's pages answer a different question, which shop needs attention and what it all costs, and people already know that shape from other software.

Changing a plan stays on the Location's page, since paying is per Location (ADR 0003) and that page already handles every state. A chain with many Locations would make this slow, and a route returning a Business's summary in one call can replace these reads then.
