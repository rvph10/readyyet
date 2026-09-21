# ReadyYet domain glossary

ReadyYet lets businesses that take in physical items for work (repairs, cleaning, etc.) give their clients a way to track progress, without phone calls and without the client needing an account. This doc defines the vocabulary used everywhere else (code, other docs, conversation), so terms stay consistent.

## People and access

- **User**: a single login identity in the system. One user can be involved with multiple shops, even across unrelated organizations.
- **Organization**: the top-level account a business owner creates (e.g. "Pizza Hut"). An organization groups one or more shops under one owner. This is what's often called a "tenant" in multi-tenant systems.
- **Owner**: the single user who created the organization. Implicitly has access to every shop in it. Exactly one per organization.
- **Shop**: a single physical location under an organization (e.g. one branch). Each shop has its own subscription and its own category.
- **Membership**: the link between a user and a shop, carrying a role. This is how access is granted, always scoped to a specific shop, never to a whole organization.
- **Role**: `employee` or `admin` (plus the implicit `owner`), set per membership. An employee can view/create/update tickets and see client info. An admin additionally manages billing, shop settings, and team for the shop(s) they're a member of.
- **Client**: the end customer who drops something off. Has no account and no login, identified only in the context of a ticket (name, email).

## Work and tracking

- **Job**: the everyday word for what a client drops off (a repair, a cleaning job, etc.).
- **Ticket**: the system record of a job. Use "ticket" as the technical term in code and docs, "job" is fine in conversation with the client.
- **Status**: one label describing where a ticket currently stands (e.g. RECEIVED, DIAGNOSE, REPAIR, DONE). Statuses are a fixed, developer-seeded, translatable catalogue, never free text.
- **Workflow**: an ordered sequence of statuses a ticket moves through, start to finish.
- **Category**: the type of business a shop runs as (garage, pressing, maroquinerie, etc.). Determines the shop's default workflow.
- **Tracking link / tracking page**: the public, no-login page a client reaches at `readyyet.app/t/[code]` (by email link or QR code) to see their ticket's current status and history.

## Access model in one sentence

A user's access to data is entirely determined by which shops they hold a membership at and what role they hold there, not by organization membership.
