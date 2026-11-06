# 0099: The Team page

Date: 2026-11-06

Builds the screens for ADR 0017's team rules and ADR 0031's member limit. The API needed no change.

## Decision

`/locations/:locationId/team` is for Owners and Admins, and a 404 for an Employee, like the API. On one grid: the members, how many people have joined with the way to invite more, and the invitations.

**Only what the API would allow is offered.** The Owner can change anyone's Role between Admin and Employee, remove them, and invite either Role. An Admin can remove Employees and invite Employees, and sees Admins and their invitations without any action on them. Nobody manages the Owner. Choosing a Role explains what each one can do, and changing or removing someone happens in a side panel, as ADR 0087 asks.

**Invitations show the latest for each address.** Pending ones can be sent again or withdrawn, expired and declined ones can be sent anew with the same address and Role. Withdrawn ones and those of someone who has joined are gone from view.

**The big number is who has joined.** An invitation isn't a person at the Location until it's accepted, so pending ones are said separately. On Essentiel a line says how many of its places are taken, pending invitations included, as the API counts them. Once full, or on a frozen Location, the way to invite becomes a link to Billing.

An Admin leaves the Location from their own row. An Employee has no way yet, as this page isn't theirs: it belongs with their account settings. Transferring ownership is the Business's, not a Location's (ADR 0017), and waits for the Business's settings.

## Why

A button the API refuses only teaches people the button doesn't work. The rules are simple enough to mirror (`canManage`, with the API's `assertCanManage` still deciding).

Hiding a full Location's invite button would leave an Owner wondering why they can't add anyone, and showing it would end in an error after typing an address. A link to Billing says the reason and leads to the fix.
