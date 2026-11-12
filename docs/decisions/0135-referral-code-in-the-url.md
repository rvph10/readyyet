# 0135: The referral code travels in the URL

Date: 2026-11-12

## Decision

A referral link is still `/sign-in?ref=<code>`, but the web app no longer keeps the code in a `ref` cookie. The sign-in page sends the User on to `/?ref=<code>`, the overview page to `/businesses/new?ref=<code>` when the User has no Business yet, and the create form sends it as `referralCode`. A code longer than 64 characters is dropped, as before. The API still ignores a code it doesn't know (ADR 0040).

This replaces the 60-day `ref` cookie of ADR 0032 and ADR 0047. The proxy deletes one left on a device. A visitor who leaves after following a link and comes back later without it is no longer credited to the referrer.

## Why

The cookie credited a sales partner or a sponsor, which serves ReadyYet and the referrer rather than what the visitor asked for. The Data Protection Authority exempts only what is strictly necessary for the service requested, so it would likely need consent, and a refusal would lose the referral anyway. Carrying the code through the sign-up in the URL stores nothing on the device (user decision, 2026-11-12).
