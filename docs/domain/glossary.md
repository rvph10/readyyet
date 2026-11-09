# ReadyYet domain glossary

ReadyYet lets businesses that take in physical items for work (repairs, cleaning, etc.) give their customers a way to track progress, without phone calls and without the customer needing an account. This doc defines the vocabulary used everywhere else (code, other docs, conversation), so terms stay consistent.

## People and access

- **User**: a single login identity in the system. One user can be involved with multiple locations, even across unrelated businesses.
- **Business**: the top-level account a business owner creates (e.g. "Pizza Hut"). A business groups one or more locations under one owner.
- **Owner**: the single user who created the business. Implicitly has access to every location in it. Exactly one per business.
- **Location**: a single physical site under a business (e.g. one branch or workshop). On screen it reads "shop" (ADR 0107). Each location has its own subscription and its own business type.
- **Membership**: the link between a user and a location, carrying a role. This is how access is granted, always scoped to a specific location, never to a whole business.
- **Role**: `employee` or `admin` (plus the implicit `owner`), set per membership. An employee can view/create/update tickets and see customer info. An admin additionally manages billing, location settings, and team for the location(s) they're a member of.
- **Customer**: the end user who drops something off. Has no account and no login, identified only in the context of a ticket (name, email, optional phone for the shop's own reference, never used by any automated system behavior).

## Work and tracking

- **Job**: the everyday word for what a customer drops off (a repair, a cleaning job, etc.).
- **Erased Customer**: what a Customer is called once their personal data has been erased. Their Tickets stay under this name. Say "erase", not "delete", for this action (ADR 0097).
- **Ticket**: the system record of a job. Use "ticket" as the technical term in code and docs, "job" is fine in conversation with the customer.
- **Status**: one label describing where a ticket currently stands (e.g. RECEIVED, DIAGNOSE, REPAIR, DONE). Statuses are a fixed, developer-seeded, translatable catalogue, never free text.
- **Workflow**: an ordered sequence of statuses a ticket moves through, start to finish.
- **Business type**: the kind of business a location runs as (garage, pressing, maroquinerie, etc.). Determines the location's default workflow.
- **Tracking link / tracking page**: the public, no-login page a customer reaches at `readyyet.app/t/[code]` (by email link or QR code) to see their ticket's current status and history.
- **Estimated ready date**: the date a ticket's item should be ready, a calendar date on the location's clock with no time (ADR 0030). The shop's own promise, never computed by ReadyYet on its own guess. Shown to the customer until the ticket reaches `READY`.
- **Turnaround time**: the number of open days a location usually needs for a job, set once in its settings. It prefills a new ticket's estimated ready date, counting only the days the location is open (ADR 0036).
- **Reminder**: an email to the customer of a ticket still at `READY`, 3 and 10 days after it got there, sent only in the daytime on the location's clock (ADR 0028).
- **Photo**: a picture staff add to a ticket, up to 5, showing the item's condition or progress. The customer sees every photo on the tracking page, and photos are deleted when the tracking link expires (ADR 0026).
- **Customer says collected**: the customer pressed "I already picked it up" on the tracking page or in a reminder. It stops the reminders but doesn't change the status: staff mark the ticket `COMPLETED`, or dismiss the mark if the item is still there (ADR 0028).

- **Review request**: on a Pro location, the one email after a ticket reaches `COMPLETED`, five stars that each open the review page of the web app. Every rating gets the same choices there: tell the shop, and review on Google when the location set its Google review link (ADR 0114, ADR 0125).
- **Feedback**: a customer's answer on the review page, once per ticket: stars, tags from a fixed list, and an optional private message. Saved by the customer's own action, never by opening the page. It needs a follow-up while unhandled with a message or 1 or 2 stars; Owners and Admins reply from ReadyYet or close it (ADR 0039, ADR 0125).

## Billing and growth

- **Plan**: what a Location subscribes to, `Essentiel` or `Pro` (ADR 0031). There is no free plan, an Owner's first Business starts its first Location on a 14-day trial of Pro (ADR 0082).
- **Sponsor**: an Owner whose referral link brought in a new Business. Rewarded with a credit on their bill.
- **Sales partner**: a User the platform admin has marked as one, earning a commission on the Businesses their referral link brings in (ADR 0032). Not a Role: it has nothing to do with any Location.
- **Campaign**: a Stripe promotion code giving a discount to new or existing Businesses.
- **Platform admin**: the person running ReadyYet itself, identified by email in configuration, not a Role.

## Access model in one sentence

A user's access to data is entirely determined by which locations they hold a membership at and what role they hold there, not by business membership.
