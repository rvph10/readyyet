# 0104: One Business at a time

Date: 2026-11-06

Replaces ADR 0092's picker showing every Location grouped under its Business, and ADR 0103's Location switcher listing every Location. ADR 0077's rule that nothing remembers a current Location still applies, and so does ADR 0092's search and tile.

## Decision

**The Business scopes what you choose from.** The top bar's Location switcher and the picker at `/` show the Locations of one Business only. The Business switcher moves between them, and lists every Business the User works at, not only the ones they own.

**The Business is in the URL,** as `/?business=:id`, and nothing remembers it. Without it, or with one that isn't theirs, the picker opens on a Business they own, else on their first.

**Choosing a Business** leads its Owner to its pages. Anyone else goes to the Location itself when they have one there, or to the picker for that Business when they have several.

**A phone has no top bar,** so the picker lists the Businesses as filters over its tiles, and the switcher in a Location's bar lists both Locations and Businesses.

## Why

A User at several Businesses saw all their Locations at once, most of them irrelevant to what they came to do. Choosing the Business first is how Supabase's organisations work, and it shortens the list where a mistake costs most, picking the wrong shop.

Keeping the choice in the URL means two tabs can show two Businesses, as with Locations in ADR 0077, and a link leads to the same place for everyone. It also cuts the picker's calls to one Business's Locations.
