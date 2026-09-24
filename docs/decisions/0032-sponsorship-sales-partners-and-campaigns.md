# 0032: Sponsorship, sales partners and campaigns

Date: 2026-09-24

Builds on the plans in ADR 0031. Everything here depends on billing, which isn't built yet.

## Decision

### Referral links

Two kinds of people have a referral link:

- **Sponsor**: every Owner. Their link is on the Business's billing page.
- **Sales partner**: a User the platform admin marks as one (see Back office). Their link is on their sales partner page.

A referral link leads to the sign-up page and is remembered in the browser for 60 days. The first link clicked wins, a later one doesn't replace it. When the visitor creates a Business, the referrer is recorded on it and never changes afterwards. A Business has at most one referrer, a sponsor or a sales partner, never both. Nobody can refer a Business they own.

### What the new Business gets

A referred Business gets half a month of the plan it chooses off its first invoice, monthly or yearly: €14.50 on Essentiel, €24.50 on Pro. It's a Stripe coupon applied at checkout.

### What a sponsor gets

When the referred Business pays its first invoice, the sponsor's Business gets a credit worth one month of the plan the new Business chose, on its Stripe customer balance, used by its next invoices. A sponsor still on trial keeps the credit until their first invoice.

### What a sales partner gets

35% of what the referred Business pays, excluding VAT and after any discount, for 6 months from its first paid invoice:

- every Location of that Business counts, including ones added later within the 6 months,
- a yearly invoice counts for the share of its months that falls within the 6 months,
- a Business that cancels stops producing commission, only paid invoices count,
- a commission is pending for 14 days after its invoice is paid, then owed. An invoice refunded or disputed within those 14 days earns nothing.

A sales partner has a page in the web app showing each Business they brought in (its name only), each commission with its invoice date, amount and state (pending, owed, paid), the date their 6 months end for each Business, and a total per month.

Payment is made outside ReadyYet, by the platform admin. The app records what's owed and when it was marked paid, nothing more. The legal form of the payment (student job contract, invoice from a self-employed student) is outside the app.

### Campaigns

A campaign is a Stripe promotion code the platform admin creates in the Stripe Dashboard, which sets its discount, duration, expiry and number of uses. ReadyYet builds nothing to create or configure one.

- A new Business enters the code at checkout, an existing one on a Location's billing page, where it applies to that Location's subscription.
- A link with the code prefills it, for campaigns sent by email.
- A subscription has one discount at a time. A code entered where a discount is already applied (a referral discount at checkout, a campaign running on a subscription) replaces it, and the resulting price is shown before confirming.
- A campaign discount doesn't change the referrer. A sales partner's commission is computed on what was actually paid.

### Back office

The platform admin is whoever's email is in the `PLATFORM_ADMIN_EMAILS` environment variable. They get a section of the web app, and only this:

- mark an existing User as a sales partner, or remove that status (commission already earned stays owed),
- list commissions owed per sales partner, and mark them paid.

## Why

Rewarding both sides is the common pattern (Dropbox, Qonto): the new Business has a reason to use the link, the sponsor a reason to share it. The sponsor's reward waits for a paid invoice so fake sign-ups earn nothing. A credit on the bill is a reward only an Owner can use, which is why only Owners sponsor, they're the ones paying.

A sales partner's commission is on what's actually paid, so a heavily discounted customer never costs more in commission than it brings in. The 14 days before a commission is owed leave time for refunds and card disputes, so no one is paid for a sale that was reversed.

First click wins, and one referrer per Business, so two people never argue over the same shop and ReadyYet never pays twice for it.

Campaigns live in Stripe because Stripe already stores, applies and limits promotion codes, and only the platform admin creates them. An admin screen in ReadyYet would repeat the Stripe Dashboard. One discount at a time is Stripe's default, and showing the price before confirming means a Business never swaps a better discount for a worse one by accident.

The platform admin is identified by an environment variable because there's one of them, and an admin role in the database would be machinery nobody else needs.
