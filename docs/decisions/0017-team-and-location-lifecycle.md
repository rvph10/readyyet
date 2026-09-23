# 0017: Team and Location lifecycle

Date: 2026-09-24

## Decision

### What an Admin can do to the team

An Admin manages Employees only: invites someone as Employee, removes an Employee, changes nothing else. Making someone an Admin, demoting an Admin, removing one, or inviting or revoking an Admin invitation is the Owner's alone. Anything else is rejected as forbidden.

### Leaving a Location

Any member except the Owner can remove their own Membership. The Owner can't leave a Location of their own Business, they transfer ownership first.

### Resending an invitation

A pending invitation can be sent again, which also pushes its expiry back to 7 days from then. An expired one can't, staff create a new invitation instead. The same Admin rule applies: an Admin can only resend an Employee invitation.

### Transferring ownership

The Owner transfers a whole Business at once, to a User who is already an Admin at one of its Locations. It takes effect immediately, in one transaction:

- the Business's owner becomes that User,
- their Membership becomes `OWNER` on every Location of the Business, created where they had none,
- the previous Owner's `OWNER` Memberships become `ADMIN`, so they keep access until they choose to leave.

There's no acceptance step and no email.

### Deleting a Location

Only the Owner can delete a Location, the last one of a Business included. It's a soft delete, final in v1 (there's no restore):

- the Location disappears for every member, every route under it answers 404, invitations to it can't be accepted,
- its tracking links answer 404 and its customers get no more emails (ADR 0013, ADR 0015), status emails already waiting are dropped,
- pending invitations to it are revoked,
- its data stays in the database: tickets are permanent records (see `docs/architecture/data-model.md`).

Once billing exists, deleting a Location must also cancel its subscription.

## Why

Admins hiring and letting go of staff is day-to-day work, deciding who holds admin power over a Location isn't. If Admins could manage each other, any one of them could lock the others out or promote a friend, and the Owner, who pays for every Location, would have to notice. Keeping the Admin role in the Owner's hands leaves exactly one person able to change who runs a Location.

Transfer only to an existing Admin because they're already a trusted, signed-up User the Owner has worked with, so there's no one to invite, nothing pending to expire, and no typo sending a Business to a stranger. Keeping the old Owner on as Admin makes the handover safe (nothing is lost if they still have work to finish), and leaving is one action away.

The Owner is the one person with authority over the whole Business (ADR 0002), so deleting a Location, with every ticket and customer in it, is theirs alone. A soft delete keeps tickets intact as the permanent records they are, and restoring can be added later if support requests show it's needed, a Location created by mistake is the common case and doesn't need one.
