# 0018: Staff account language, ownership transfer emails, account deletion

Date: 2026-09-24

## Decision

### A User's language

A User has a `locale` (the same `Locale` as Locations and Customers, ADR 0015). It's set when the account is created, from the browser language of the sign-in request that created it, English when the browser prefers nothing we support. The User can change it afterwards.

It's the language of every email sent to a User who already has an account. The sign-in code keeps using the browser language, since it's often sent before the account exists. An invitation uses the invitee's own `locale` when that email address already has an account, the Location's otherwise.

### Ownership transfer emails

This replaces ADR 0017's "there's no acceptance step and no email": the transfer still takes effect immediately, but both people are emailed right after it, each in their own language:

- the new Owner learns they now own the Business, and what that means (they alone manage Admins, transfer or delete Locations),
- the previous Owner learns the Business was transferred, to whom, and that they remain an Admin.

### Deleting a staff account

A User can delete their own account. It's an anonymisation, like a Customer's erasure, not a delete: the `User` row stays, because tickets, Status changes and invitations record who made them.

- Their name becomes "Former member" and their email address a placeholder that can never receive mail or match a real address. `deletedAt` is set.
- Their sessions, sign-in records and Memberships are deleted, so they lose all access immediately. Nothing else they did is removed or reassigned.
- Invitations they sent that are still pending stay valid, they were sent on the Location's behalf.
- Signing in again later with the same address creates a new, empty account.
- It requires a sign-in within the last 10 minutes. Otherwise it's refused and the web app asks for a new code first.
- An Owner can't delete their account while they own a Business that still has a Location: they transfer it or delete its Locations first.
- A confirmation is emailed, in the User's language, to the address the account had, once the deletion has gone through. Replies go to the support inbox (`SUPPORT_EMAIL`), like the previous Owner's copy of a transfer email.

## Why

Staff emails need a language, and a User's own choice is the only reliable one: a User can work at Locations in different languages, and the browser that happened to request a sign-in code isn't always theirs. Setting it from the browser at sign-up makes it right for most people without asking.

A transfer is the most powerful action in the app and it happens without the recipient's consent, so it shouldn't be silent. The email to the previous Owner matters most: if their account is ever taken over, a transfer is how the Business would be taken, and that email is how they find out.

Anonymising keeps every ticket's history whole ("Former member" changed it to READY) while the person's name and address are gone, the same trade-off already made for Customers (`docs/architecture/data-model.md#gdpr-erasure`). Requiring a recent sign-in stops someone at an unlocked shop computer from wiping a colleague's account. Blocking an Owner who still owns a live Business avoids a Business nobody can manage: only its Owner can transfer it, add Locations or manage Admins (ADR 0002, ADR 0017).
