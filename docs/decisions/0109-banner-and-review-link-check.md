# 0109: A Business banner, and checking a review link

Date: 2026-11-07

## Decision

### Banner

A Business can have a banner next to its logo, a wide picture cropped to 1600 by 480 and stored like the logo (ADR 0026, ADR 0051): a key in the bucket, served publicly, set and removed by the Owner alone. It leads the Business's settings and home, and the top of every tracking page. A Business without one shows nothing in its place on the tracking page, and a plain lime band in its settings.

### Checking a review link

`POST /locations/:id/review-link/check` follows a Google review link from the server and answers `works`, `dead` or `unknown`. A link Google no longer knows ends on its home page or a 404. Every redirect is checked before it's followed, and only Google's hosts are, so a link can't make the API call anything else.

## Why

Opening the link in a new tab only tested that a browser opens links, and left the shop to judge what it saw. Following it finds the common failure, a link copied wrong, without leaving the page.

It can't say whose review page a link opens: Google asks to sign in before showing it, so a wrong place id passes. The page keeps a link to open it by hand for that.
