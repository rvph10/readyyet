# 0040: How referrals, discounts and commissions are recorded

Date: 2026-09-25

Implements ADR 0032 on top of the billing of ADR 0033, and settles the points it leaves open.

## Decision

### Referral codes

- A sponsor's code belongs to the Business, since the credit goes on that Business's bill. It's created with the Business. An Owner of two Businesses has two links.
- A sales partner's code belongs to the User, created when the platform admin marks them. Removing the status keeps the code, marking them again brings the same link back.
- Both are random, never an id, so a link says nothing about how many Businesses exist.
- `POST /businesses` takes the code the web app remembered. A code that matches nobody, or one that belongs to the person signing up, is ignored, the Business is created without a referrer.

### Discounts

- The referral discount is a Stripe coupon, `referral-essentiel` (€14.50) or `referral-pro` (€24.50), `duration: once`, the same ids in test mode and in live mode.
- It's applied to a referred Business's checkouts until one of them completes with it. The Business's first paid invoice is the one it lands on.
- A campaign code is typed in the web app, before checkout or on a paying Location's billing page, and sent to the API. Stripe Checkout's own code field stays off: it can't be shown on a checkout that already carries a discount, so a referred Business couldn't swap its referral discount for a campaign there.
- At checkout a campaign code replaces the referral discount, Stripe Checkout then shows the price before paying. On a paying Location, the API first previews the next invoice with the code, then applies it in a second call.

### The first paid invoice

The first `invoice.paid` for more than zero on a referred Business's Stripe Customer marks the Business as paying. An invoice for zero, like the one a trial starts with or one covered by a full discount, doesn't count. From that moment:

- the sponsor's Business gets its credit, one month of the plan on that invoice at the monthly price, read from Stripe by lookup key. A sponsor without a Stripe Customer gets one, and their first invoice uses the credit,
- a sales partner's 6 months start.

### Commissions

- 35% of what the card was charged for the invoice, VAT excluded. A sponsor credit or campaign that lowers the charge lowers the commission.
- An invoice counts for the part of its billing period inside the 6 months. A monthly invoice falls inside or outside, a yearly one counts for its months inside, a prorated upgrade for its days inside.
- Only while the User is a sales partner. Removing the status stops commissions on invoices paid afterwards, those already recorded stay.
- A commission's state is computed from its dates, never stored: pending for 14 days after its invoice was paid, owed after that, paid once the platform admin marks it. A refund or a dispute on the invoice within the 14 days voids it, later ones change nothing.
- The platform admin marks commissions paid by listing their ids, so one that became owed after the list was loaded isn't marked paid with the rest.
- A sales partner's monthly totals group commissions by the UTC month their invoice was paid in.

## Why

A code on the Business keeps the rule "credit on the Business that referred" a plain foreign key, with no guessing which Business of an Owner earns it.

Ignoring a bad code rather than refusing it: the link can be 60 days old, and a shop that fails to sign up because of it is worth more than the referral.

A coupon is how Stripe applies a fixed amount off one invoice, and fixed ids are the only stable handle a coupon has, the way lookup keys are for prices (ADR 0033).

What the card was charged is what ReadyYet actually received. A commission on a credit ReadyYet gave away would pay out money that never came in, the same reasoning ADR 0032 gives for discounts.

Stopping commissions with the status keeps removal meaningful: the platform admin removes someone who shouldn't earn anymore, and money already earned is left alone as ADR 0032 says.

A state computed from dates needs no job to move a commission from pending to owed, the same choice as a frozen Location (ADR 0033).
