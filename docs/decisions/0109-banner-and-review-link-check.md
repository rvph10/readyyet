# 0109: A Business banner, and checking a review link

Date: 2026-11-07

## Decision

### Banner

A Business can have a banner next to its logo, a wide picture cropped to 3:1, 1500 by 500 like most apps' covers, and stored like the logo (ADR 0026, ADR 0051): a key in the bucket, served publicly, set and removed by the Owner alone. It always shows whole, at 3:1, never as a thinner band: over the logo in the Business's settings, beside the greeting on its home, where the full width would take half the screen, and on tracking pages at the top of a phone and in the shop's tile on a computer. Without one, a tracking page shows nothing in its place and the Business's pages a pine band.

### Checking a review link

`POST /locations/:id/review-link/check` follows a Google review link from the server and answers `works`, `dead` or `unknown`. A link Google no longer knows ends on its home page or a 404. Every redirect is checked before it's followed, and only Google's hosts are, so a link can't make the API call anything else.

## Why

Opening the link in a new tab only tested that a browser opens links, and left the shop to judge what it saw. Following it finds the common failure, a link copied wrong, without leaving the page.

It can't say whose review page a link opens: Google asks to sign in before showing it, so a wrong place id passes. The page keeps a link to open it by hand for that.
