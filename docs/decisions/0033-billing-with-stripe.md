# 0033: Billing with Stripe

Date: 2026-09-24

Implements the plans and trial of ADR 0031. Replaces the `processed_stripe_event` table planned in `docs/architecture/data-model.md`.

## Decision

### Stripe objects

- One Stripe Customer per Business, created the first time one of its Locations goes through checkout. One Stripe subscription per Location, on that Customer.
- Four prices, found by lookup key, never by id: `essentiel_monthly`, `essentiel_yearly`, `pro_monthly`, `pro_yearly`. The same keys exist in test mode and in live mode.
- The Location's id is in the subscription's metadata, which is how a webhook finds its Location.

### Trial and state

The trial lives in our database, Stripe knows nothing about it until a plan is chosen. Each Location has a `subscription` row created with it:

- the first Location a Business ever has starts with a trial ending 14 days later,
- any later Location starts without one, and has to go through checkout before it can be used.

A Location is frozen (ADR 0031) when its trial is over and it has no paid subscription, or when its subscription has ended. Frozen is computed from the row when needed, nothing flips it at midnight.

Choosing a plan during the trial goes through checkout with the subscription's trial ending when ours does, so the card is only charged then and the shop keeps the days it was given.

### Checkout and the portal

- The first payment of a Location goes through Stripe Checkout, which also collects the billing address and the shop's VAT number for its invoice.
- The Owner reaches Stripe's Customer Portal for cards, invoices and billing details. Changing plan in the portal is turned off, it can't enforce the member limit.

### Changing plan

- A change to a price that costs more per month takes effect at once, prorated.
- A change to a price that costs less per month takes effect at the end of the current period, through a subscription schedule. Moving to Essentiel is refused while the Location is over its member limit, and once it's scheduled, invitations are held to that limit too.

Per month, the order is: Essentiel yearly (€24.17), Essentiel monthly (€29), Pro yearly (€40.83), Pro monthly (€49). So every move to Pro is immediate, and moving from monthly to yearly waits for the renewal.

### Stopping

- The Owner can cancel a Location's subscription. It stays usable until the end of the paid period, then it's frozen. Choosing a plan again unfreezes it.
- Deleting a Location (ADR 0017) cancels its subscription at once, without refund.
- After failed payments, Stripe retries for up to 2 weeks, the Location keeps working meanwhile. Once retries run out, Stripe cancels the subscription and the Location is frozen.

### Webhooks

Every relevant event is handled the same way: fetch the subscription from Stripe and write its current state onto the Location's row. Stripe can send an event twice or out of order, re-reading the latest state makes both harmless, so no table of processed events is kept.

### VAT

ReadyYet is under the Belgian small business franchise regime: no VAT is charged. Prices carry no tax, and the franchise mention and ReadyYet's VAT number are in the invoice footer set in the Stripe Dashboard. Past €25,000 of yearly turnover this changes, and Stripe Tax gets turned on.

### Trial reminder

Three days before a trial ends, the Owner gets one email, in their language, with a link to choose a plan.

## Why

A Customer per Business matches who pays: the Owner has one card and one set of invoices for all their Locations, and ADR 0032 puts sponsor credit on the Business's balance, which only exists on a single Customer.

A trial with no card has nothing for Stripe to charge or remind about. Keeping it in our database avoids creating empty subscriptions, and makes the one-trial-per-Business rule a plain check on our own data.

Computing frozen from dates, rather than storing it, means there is no job whose delay would leave a Location usable after its trial, or frozen after it paid.

Moving to a cheaper price at the end of the period is the common SaaS behaviour: the shop keeps what it already paid for, and there is no refund to compute. Subscription schedules are Stripe's own tool for that. Moves up are immediate so Pro's features arrive when they're paid for.

Re-reading the subscription on each webhook is a widely used way to keep a local copy of Stripe's state in sync, and it's simpler than tracking processed events: a duplicate or late event writes the same latest state again.
