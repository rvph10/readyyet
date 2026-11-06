# 0092: The Location picker shows live numbers

Date: 2026-11-06

Replaces ADR 0077's "Live numbers on the cards are left out until an API exists for them". The rest of ADR 0077 still applies: `/` depends on what the User has to choose, it asks every time, and there's no list across every Location.

## Decision

**The picker at `/` follows Vercel's project grid.** It opens with the greeting, then one tile per Location grouped under its Business. A tile shows the Location, the User's Role, and how many Tickets are ready and late, lime and red when there are any.

**A Business takes the columns its Locations need**, up to three, so Businesses with one or two Locations share a row and every tile keeps the same width. Owners get Add and Settings beside the Business's name, replacing the dashed "Add a Location" card.

**A search box appears from 7 Locations.** It filters by Location and Business name, ignoring accents and case.

**The numbers come from `GET /locations/:id/tickets/overview`,** one call per Location, read in parallel when the page loads. A Location whose call fails shows without its numbers.

## Why

Now that ADR 0088's route exists, the numbers cost no API change, and they tell an Owner which shop needs attention before opening it. A Location that can't be opened because a count failed would be worse than a missing count, as this page is the way in.

The route returns more than the counts, up to 100 Tickets per Location. That's acceptable for the few Locations a User has, and a counts-only route can replace it if a User with many Locations makes this page slow.

Businesses used to take a full row each, so several with one Location pushed the rest off the screen. The search stays away below 7 Locations, where every tile can be seen at a glance.
