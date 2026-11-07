# 0051: The logo is the Business's, and an invitation can be read before sign-in and declined

Date: 2026-09-28

## Decision

### The logo belongs to the Business

Replaces the Location logo of ADR 0026 and ADR 0038.

- A Business has one logo, `business.logo_key`, shown for every one of its Locations: on the tracking page, in Customer emails, in the Location's API response and on the invitation page. `location.logo_key` is gone.
- Only the Owner uploads or removes it, at `PUT` and `DELETE /businesses/:id/logo`, like renaming the Business. Upload, storage and serving are unchanged from ADR 0026 and ADR 0038.
- Deleting a Location keeps the logo. The migration gave each Business its oldest live Location's logo, the other Locations' objects are left to the `orphan-images` sweep.

### Reading an invitation before sign-in

Extends ADR 0047's reading of an Invitation, which stays as it was for the signed-in read, plus the fields below.

- `GET /invitations/:id/preview` answers without a session: who invites, the invited address, the role, the status, when it was sent and when it expires, the Location's name, the Business's name and logo. Not the team. It's limited to 30 requests a minute per client, like the tracking page.
- The page an invitation link opens shows this to a signed-out visitor with one action, "Continue as <address>", which sends the sign-in code to that address and comes back to the invitation once signed in (ADR 0046's `?next=`).
- Signed in with the invited address, `GET /invitations/:id` adds the Location's current team: each member's name and avatar. Accepting is unchanged.

### Declining

- The invited User can decline a pending invitation, `POST /invitations/:id/decline`. Its status becomes `DECLINED`, a new value, and it can't be accepted afterwards: staff send a new one.
- No one is emailed. The Location's list of invitations shows it as declined.

## Why

A chain like "InfoRepair" with Locations in Ixelles and Evere has one brand: one logo per Location made the Owner upload the same file for each, and let one Location's Admin change how the brand looks at that Location alone. The logo is a Business-wide setting, and every Business-wide action is the Owner's (ADR 0002).

An invitation link used to send a signed-out visitor straight to the sign-in page, which didn't say which address to use. An invited employee who never signed up has no reason to know it has to be the one the email went to. Slack, Notion, Linear and Figma all open the invitation first and name the address, so the invitee signs in with the right one on the first try.

The preview gives the id's holder nothing they couldn't read in the email the link came in: the id is an unguessable UUID sent only to that address (see the data model). The team is left to the signed-in read, since a forwarded link shouldn't list a shop's staff to whoever it reaches. Signing in straight from the link, without a code, was ruled out for the same reason: a forwarded email would open the account.

Declining lets an invitee say no instead of leaving the invitation to expire, and lets staff see that answer. An email to the inviter was left out, the list already shows it and a refusal doesn't need anyone to act.
