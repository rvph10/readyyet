# 0002: Access is granted per shop, not per organization

Date: 2026-09-21

## Decision

A user's access to a shop is a separate `Membership` record (`user`, `shop`, `role`), not a property of the organization. A user can hold memberships at multiple shops, including shops in unrelated organizations, with a different role at each. The organization owner gets an implicit `owner` membership automatically on every shop created in their organization. There is exactly one owner per organization. Admins are scoped to the shop(s) they hold a membership at, not the whole organization.

## Why

A real employee works specific locations, not an entire brand. Scoping access at the organization level would leak data across shops an employee has no reason to see (e.g. an employee in Beijing seeing New York tickets) and doesn't handle a person working at unrelated businesses (an employee working both "Pizza Hut" and "Dominos" needs two independent memberships, not a merged identity). Making the owner's access an implicit membership, rather than a special-cased bypass, keeps one permission mechanism (role on a membership) instead of two systems to keep in sync.
