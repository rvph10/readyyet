# 0132: Analytics only after consent

Date: 2026-11-11

## Decision

The site and the web app measure visits with PostHog (EU cloud, Frankfurt), and only once the visitor accepts:

- Nothing of PostHog loads before consent: no script, no cookie, no request, not even PostHog's cookieless mode.
- A banner asks on the first visit, with "Accept" and "Refuse" side by side and in the same style. Closing or scrolling is not an answer, so the banner stays until one is clicked.
- The answer is kept in a `cookie-consent` cookie for 6 months, on the parent domain so one answer covers readyyet.app and app.readyyet.app. After 6 months the banner asks again.
- A "Cookie settings" link (site footer, sign-in footer, profile menu) reopens the banner. Refusing after accepting deletes PostHog's cookies and storage and reloads the page, so nothing of it keeps running.
- Pages for Customers (`/t/…`) never load analytics and never show the banner. A Customer has no contract with ReadyYet and is there only to follow their item.
- Visitors stay anonymous: no `identify`, no session replay, no surveys, and PostHog may not load more code than the bundled package (`disable_external_dependency_loading`), so the CSP only opens `connect-src` to its EU host.
- Without `NEXT_PUBLIC_POSTHOG_KEY` (locally, in CI) there is nothing to consent to, so no banner shows.

The `locale`, `sidebar` and setup guide cookies last 6 months instead of a year.

## Why

Belgian law (art. 10/2 of the law of 30 July 2018, ePrivacy art. 5(3)) requires consent before reading or storing anything on a device that is not strictly necessary, and the Data Protection Authority's cookie checklist says visitor counting is not exempt, names fingerprinting as covered, asks for a Refuse button on the first level with the same weight as Accept, and keeps a choice about 6 months. PostHog's cookieless mode hashes the IP and user agent on its servers; no Belgian authority has endorsed that, so loading nothing before consent is the choice without risk (user decision, 2026-11-10).

Language and layout cookies are exempt as preferences the user set; 6 months aligns them with the authority's yardstick at no cost.
