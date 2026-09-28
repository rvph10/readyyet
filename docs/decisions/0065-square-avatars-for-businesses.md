# 0065: Square avatars for Businesses

Date: 2026-09-28

## Decision

Replaces the Business avatar of ADR 0064.

`Avatar` takes a `shape`: `circle`, the default, for a User, and `square` for a Business, with corners about a quarter of its side, from `rounded-md` at 24px to `rounded-3xl` at 80px. Both pick their colour the same way, the FNV-1a hash of their id over the palette of ADR 0058, and both show initials when there's no picture or it fails to load.

A User's photo fills its circle. A Business's logo sits whole inside its square on white, with a `border` outline and some margin, since logos come in every shape and often on a transparent background.

`BusinessAvatar`, with its lime initials on ink, is removed.

## Why

A Business with no logo looked the same as every other, in the brand lime that ADR 0042 keeps for READY. With the avatars' colour algorithm, each Business gets a colour of its own that stays the same everywhere, and nothing new has to be maintained.

The shape keeps the two apart where both show, like an invitation's Business above the faces of the team it would join.
