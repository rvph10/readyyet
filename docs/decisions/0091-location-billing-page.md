# 0091: A Location's Billing page

Date: 2026-11-06

Replaces ADR 0087's "The Billing page itself isn't built yet". Its return from Stripe Checkout to Today stays, for a new reason.

## Decision

`/locations/:id/billing` is a bento for Owners and Admins, as the API's roles allow. One large tile says where the Location stands, with the one thing to do about it: a trial, new Tickets paused, a failed payment, a plan stopping, a move waiting, or a plan running. Beside it are the next payment, the two plans, a promotion code and, for an Owner, stopping.

**A Location without a plan** chooses one here and goes to Stripe Checkout. The red tile says "New Tickets are paused", not that a trial ended, because a later Location never had one. The sidebar's card says the same.

**A paying Location** moves plan or interval after a confirmation saying when it starts and what it costs. Moving to Essentiel also says what stops. A move waiting and a cancellation are undone by keeping the plan.

**The next payment shows the plan's list price**, not what the invoice comes to: `BillingDto` doesn't carry the amount, and a discount can lower it. The exact figure only appears when previewing a code.

**A promotion code** is previewed, then applied, on a paying Location. Before a plan there's no preview route, so the code is sent with the checkout, and Stripe shows the price there.

**Stripe's return from Checkout still lands on Today**, which thanks the Owner. It arrives before the webhook, so this page could still offer a plan that was just paid for.

**Stripe's portal returns to `/businesses/:id/billing`**, which redirects to the first of the Business's Locations until the Business has a billing page of its own. A later Location's Owner lands on that first Location.

## Why

The trial reminder email links here (ADR 0033), and a page that only said "coming soon" was a dead end at the moment a shop decides to pay. The owner's rule is that every trial or upgrade surface leads to paying, so each state's tile carries its action rather than only informing.

Prices stay in the web app as they do in the plan chooser. They're in ADR 0031 and only change with a decision, and reading them from Stripe would cost a call on every load for numbers that don't move.
