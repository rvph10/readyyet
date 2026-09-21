# 0002: Access is granted per location, not per business

Date: 2026-09-21

## Decision

A user's access to a location is a separate `Membership` record (`user`, `location`, `role`), not a property of the business. A user can hold memberships at multiple locations, including locations in unrelated businesses, with a different role at each. The business owner gets an implicit `owner` membership automatically on every location created in their business. There is exactly one owner per business. Admins are scoped to the location(s) they hold a membership at, not the whole business.

## Why

A real employee works specific locations, not an entire brand. Scoping access at the business level would leak data across locations an employee has no reason to see (e.g. an employee in Beijing seeing New York tickets) and doesn't handle a person working at unrelated businesses (an employee working both "Pizza Hut" and "Dominos" needs two independent memberships, not a merged identity). Making the owner's access an implicit membership, rather than a special-cased bypass, keeps one permission mechanism (role on a membership) instead of two systems to keep in sync.
