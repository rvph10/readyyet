# 0120: Back office pages

Date: 2026-11-08

Builds the back office ADR 0032 describes on the API of ADR 0040. Changes ADR 0098 for `Commission` lists.

## Decision

**The back office lives at `/admin` in the web app**, for the platform admin only. Its layout answers not found to anyone else, the same as a page that doesn't exist. The way in is a "Back office" row in the User menu, shown only when `/me` says `platformAdmin`, and its top bar has a way back to the shops. The User menu's line under the name became a plain label, so the back office says "Platform admin" without adding a Role.

**It holds what ADR 0032 lists and nothing more**: the sales partners, and their commissions.

- `/admin` lists the sales partners with their pending and owed amounts, and a "To pay now" card with the total owed and who it's owed to. Adding someone takes the email of an existing account, in a side panel.
- `/admin/sales-partners/:userId` shows one sales partner's commissions by state (Owed, Pending, Paid, Voided), their referral link, and a button that marks every owed commission on screen paid, after a confirmation naming the amount. Removing the status is there too, behind a confirmation saying what's earned stays owed.
- There's no page listing every commission across sales partners. The platform admin pays one person at a time.

**A former sales partner stays listed while still owed.** `GET /admin/sales-partners` also returns a User whose status was removed and who has commissions neither paid nor voided, with `salesPartnerSince` null, shown as Former.

**Commission lists are paged by number**, `?page=` and `?take=` returning `{ items, total }`, like every other list since ADR 0098, which kept cursors for them only because no page showed them.

**Mark paid sends the ids of the owed commissions on screen**, up to 100 at once. A commission that was voided or paid meanwhile refuses the whole request (ADR 0040), and the page reloads with the new total.

**Dates read in Brussels time**, as the back office has no Location to take a time zone from.

## Why

Paying is done by bank transfer, outside ReadyYet (ADR 0032), so the page is built around one question: how much to send to whom. The total owed leads, the button names the amount and count, and it marks only what was on screen, so a commission that became owed after the transfer was sent isn't recorded as paid with it.

Without the former sales partners, removing someone with owed commissions would hide money ADR 0040 says they keep, with no screen left to pay it from.

A 404 rather than a refusal tells nobody else there's a page here, the way the API's guard already refuses every `/admin` route.

Paging by number keeps one `Pagination` component and one list API shape across the app. A commission list is one sales partner's, so its offsets stay small.
