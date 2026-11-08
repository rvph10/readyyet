# 0120: Sales partner page

Date: 2026-11-08

Builds the sales partner's page ADR 0032 describes, on the API of ADR 0040, in the frame of the back office (ADR 0119).

## Decision

**The page lives at `/partner`**, in the same frame as the back office: a top bar with its title, a sidebar and the User menu. The User menu has a "Your sales partner page" row for anyone who has one.

**Anyone ever made a sales partner keeps the page.** `/me` says `salesPartnerPage` from the User's referral code, which marking gives and removing keeps (ADR 0040). A former sales partner sees a banner saying their link no longer earns and what they earned is still paid, without the link, and their shops read "No longer earning".

**A sales partner doesn't need a shop.** `/` sends a User with no Membership and no Business of their own to `/partner` when they have the page, instead of to creating a Business. The top bar offers "Open your own shop" to them, and "Back to your shops" to anyone who has one.

**The page leads with the link**, on a pine card with copy, the phone's share sheet where there is one, and a QR code to scan at a shop's counter. Then:

- what's coming to them, with pending and paid so far beside it,
- their shops by name only (ADR 0032), each "Not paying yet", "Earning until" the end of its 6 months, or "Ended",
- earnings by month as columns, from the first month earned or the last six, up to twelve,
- their commissions with their state, paged by number,
- how it works, in four steps.

A sales partner with no shop and no commission yet sees one welcome tile asking them to share their link, rather than three empty ones.

**The chart is SVG**, since the CSP refuses inline styles that would size columns. Each column names its month and amount to a screen reader and shows them on hover or keyboard focus, and the highest shows its amount on its cap.

## Why

A sales partner earns by signing shops up, often in person, so the link and its QR code come before the money. What's coming to them comes next, as it's what they'll ask about.

Sending someone with no shop to "Create your Business" would tell a friend who only sells ReadyYet that they're in the wrong place. Offering a shop instead keeps that door open without pushing it.

The page outlives the status for the same reason the back office lists a former sales partner: money they earned is still owed to them, and they should be able to follow it until it's paid.
