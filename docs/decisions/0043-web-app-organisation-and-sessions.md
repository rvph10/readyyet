# 0044: Web app organisation and sessions

Date: 2026-09-25

## Decision

**Domains.** Production: the sales site on `readyyet.app` (ADR 0042), the web app on `app.readyyet.app`, the API on `api.readyyet.app`. Staging mirrors it on a domain of its own, `readyyet-staging.app`, never on a subdomain of `readyyet.app`: `app.readyyet-staging.app` and `api.readyyet-staging.app`. Locally: the API on `localhost:3000`, the web app on `localhost:3001`.

**Sessions.** Better Auth's session cookie is set for the parent domain (`advanced.crossSubDomainCookies`), so the web app's server receives it along with the API. Sign-in pages live in the web app only.

**Areas.** `web/src/app/` has three route groups, each with its own layout:

- Customer pages, no account: the tracking page `/t/:code` and its confirm pages.
- Sign-in: `/sign-in`, `/sign-up`, accepting an Invitation.
- Dashboard, signed in: creating a Business, and everything under `/locations/:locationId/`.

**Code.** Routes in `app/`, with a component used by one page kept next to it. Shared building blocks in `components/ui/`, copied from shadcn/ui and restyled with the palette (ADR 0043), not installed as a library. The typed API client and Better Auth's client in `lib/`. One `messages/` namespace per area.

**Data.** Pages load their data on the web app's server, and forms change it through server actions, both calling the API. Sign-in calls Better Auth from the browser, through its client. A link in an email only ever opens a page; the change it offers happens when the person confirms on that page.

**Calls from the web app's server** go to the API over Railway's private network, forwarding the visitor's `Cookie` and `X-Real-IP` headers.

## Why

Separate origins for the web app and the API were settled in ADR 0001. Sharing the cookie across one parent domain is Better Auth's documented setup for that case, and needs no proxy in front of the API. Railway's own domains can't do it: `up.railway.app` is on the Public Suffix List, so browsers refuse a cookie shared between two services there. A staging subdomain of `readyyet.app` was ruled out because browsers would send production's session cookie to the staging servers too, putting real sessions in staging's logs.

Keeping sign-in in the web app means the sales site never handles a session, and the web app owns every page that reads one.

Loading data on the server keeps the tracking page fast on a Customer's phone and keeps API errors out of the browser. The confirm-before-acting rule exists because mail scanners open every link in an email (ADR 0037).

The API rate-limits each client by `X-Real-IP` (ADR 0025), which Railway's edge sets on every public request, replacing any value sent with it. A call from the web app's server through the public address would carry the web app's own address, and every visitor would share one limit. Over the private network there is no edge, so the web app passes on the visitor's address itself. No public request can do the same, since the edge overwrites the header, so the API's rule stays as it is.

The folder layout is the one the Next.js documentation and shadcn/ui projects use, so it reads as familiar rather than invented.
