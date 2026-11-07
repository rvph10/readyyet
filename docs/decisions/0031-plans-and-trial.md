# 0031: Plans and trial

Date: 2026-09-24

Replaces the free plan in ADR 0003 and ADR 0027: there is none. Per-location billing (ADR 0003) is unchanged.

## Decision

### Plans

Each Location subscribes to one of two plans. Prices exclude VAT.

| | Essentiel | Pro |
| --- | --- | --- |
| Monthly | €29 | €49 |
| Yearly | €290 | €490 |
| Tickets | Unlimited | Unlimited |
| Members | 2 | Unlimited |
| Workflow | The Business type's default | Custom (ADR 0003) |
| Review request and private feedback (ADR 0027) | | ✓ |

Everything else is on both plans: tracking page, customer emails, photos, reminders, estimated ready date, address and opening hours.

The member limit counts the Location's Memberships, the Owner's included, plus its pending invitations. An invitation that would go past it is refused.

### Trial

- A Business's first Location starts with a 14-day trial of Pro, no card needed. Later Locations of the same Business start paid.
- At the end of the trial the Owner or an Admin picks a plan, Pro is preselected.

### A Location that isn't paid

When a trial ends without a plan, or a subscription ends after failed payments, the Location is frozen:

- no new Tickets can be created and no one can be invited,
- existing Tickets can still change Status, customer emails keep being sent, tracking links keep working,
- choosing a plan unfreezes it, nothing is lost.

Deleting a Location still cancels its subscription (ADR 0017).

### Changing plan

- Moving to Pro takes effect at once.
- Moving to Essentiel is refused while the Location is over the member limit, staff remove members or revoke invitations first. The custom Workflow stops being active: new Tickets use the Business type's default Workflow, Tickets already open keep the Workflow they were created with (workflows are frozen per Ticket, `docs/architecture/data-model.md#workflow-versioning`). Review requests stop for Tickets completed afterwards.

## Why

A free plan gives away the whole value to the shops least likely to pay: tracking works the same for a shop with 10 Tickets a month as for one with 500. A trial of the full product shows a shop what it gets, and 14 days covers at least one full job, from drop-off to a review request, for most Business types.

No Ticket limit because Tickets are how a shop builds the habit, a cap would punish the most engaged ones, and hitting it mid-month would leave Customers without tracking links, bringing back the phone calls ReadyYet exists to remove. A Ticket costs almost nothing to run.

The Essentiel limit is 2, not 1, because most shops have someone at the counter besides the owner. With 1, they'd share the Owner's login on the shop's computer, which makes the Status history say nothing about who did what and gives every employee the Owner's powers (ADR 0017), without bringing in more revenue. Pro's value is custom Workflows and reviews, the feature that brings a shop new customers.

Prices sit well below full repair and pressing software (RepairDesk, Orderry, CleanCloud), which also run the till, invoices and stock, and far below review tools. ReadyYet replaces the phone call and the paper ticket, and works next to whatever the shop already uses.

Freezing instead of shutting down protects Customers who were promised a tracking link: they never land on a dead page because the shop's trial ended.

One trial per Business, not per Location, so deleting and recreating a Location doesn't restart it.
