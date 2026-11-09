# 0045: Web app data, errors and quality

Date: 2026-09-25

## Decision

Follows ADR 0041 (foundations) and ADR 0043 (organisation and sessions).

**API client.** `web/src/lib/api/` calls the API with `openapi-fetch`, typed by `schema.d.ts`, which `openapi-typescript` generates from `api/openapi.json`. The generated file is committed and CI fails when it's stale, like `api/openapi.json` itself. The generator is a root dev dependency: it needs TypeScript's JavaScript API, which 7.0 dropped, and the root already runs TypeScript 6.0.3 for ESLint (ADR 0001's addendum). The module starts with `import "server-only"`, so a client component importing it fails the build. It calls `API_URL` (the private network address on Railway) and forwards the visitor's `Cookie` and `X-Real-IP`.

**Caching.** API responses are never stored by Next.js: nearly every one belongs to one User or one Ticket, and pages already render per request (ADR 0041). Within a request, a read used by both a layout and its page goes through React's `cache()`, so it's called once. The catalogue, which the API marks `max-age=300`, may be revalidated every 300 seconds. There is no client-side data cache: pages read on the server, forms change data through server actions, then refresh the route.

**Errors.** A failed call becomes an `ApiError` carrying the API's `code`, `requestId` and `details`. Loading a page: `UNAUTHENTICATED` redirects to sign-in, `NOT_FOUND` renders the not-found page, anything else throws to the area's `error.tsx`. In production Next.js only passes that page a `digest` of the error, so it shows the digest, and the web app's server logs the error, `requestId` included, under the same digest. A server action returns `{ ok: true }` or `{ ok: false, code, fields }` for a 4xx, which the form can do something about, `fields` being `VALIDATION_ERROR`'s `details` per input. A 5xx is thrown like a page's, so it's reported and logged with its `requestId`. The text shown is the web app's own translation per `code`, never the API's `message`. `RATE_LIMITED` says how long to wait, from `Retry-After`.

**Retries.** A GET is retried once, after 300 ms, on a network error or a 502, 503 or 504. Nothing else is retried: not a POST, PATCH or DELETE, which could then happen twice, and not a 4xx.

**Images.** Pictures from the API (logos and avatars at `/images/...`) and from the bucket (Ticket photos, presigned) go through `next/image` with `unoptimized`: the API already resized and re-encoded them, and a presigned URL changes every 15 minutes, so Next.js's optimizer would re-encode each photo on every view without ever hitting its cache. `next/image` still gives them fixed dimensions and lazy loading. Their hosts come from environment variables, in `remotePatterns` and the CSP's `img-src`.

**Performance.** Components are server components unless they need the browser, and `"use client"` sits on the smallest interactive part, not on a page. A loading state takes the size of what it stands for. Every image has dimensions. The target is Google's "good" Core Web Vitals on a throttled phone: LCP under 2.5 s, CLS under 0.1, INP under 200 ms, checked with Lighthouse on the tracking page and the Tickets list before a PR that changes them merges.

**Input.** The API validates every request and stays the authority. Forms add the browser's own constraints (`required`, `type`, `maxLength` matching the API's limits) for quick feedback, not a second copy of the API's rules. No `dangerouslySetInnerHTML`. A URL from data (a review link, a Location's website) becomes a link only if it's `https:`. Tracking pages are `noindex`.

**Sessions.** The proxy only checks that a session cookie is present before a dashboard route, and redirects to sign-in when it isn't. The dashboard layout's call to `/me` is the real check. Customer pages never read a session. Sign-in takes the page to return to as `?next=`, only ever a path on the web app itself, so a crafted link can't send someone elsewhere after signing in.

**Configuration.** The web app's variables are checked when its server starts (`instrumentation.ts`), so a missing one fails the deploy instead of a page.

**Error tracking.** `@sentry/nextjs`, in the API's Sentry project, tagged `service: web`, with the same scrubbing as the API: no bodies or query strings, tracking codes masked. Browser events go through a route of the web app (Sentry's `tunnelRoute`), so the CSP doesn't have to allow Sentry's host. The browser SDK is imported after the page loads rather than bundled with it: bundled, it was 58 KB of the 249 KB (gzipped) every page loads before becoming interactive, and it runs before hydration. An error in the second before it arrives isn't reported. Errors only, no performance tracing and no session replay.

**Tests.** Vitest for logic without a browser (the retry rule, error mapping, URL checks). Playwright for the flows that matter, the Customer pages first, against the real API and a seeded Postgres, in CI.

**Also.** Dates and numbers are formatted through next-intl, in the visitor's locale. Every input has a label, focus is visible, everything works from the keyboard.

## Why

The API was built first and already does the hard parts: validation, access control, image processing, rate limits. The web app's foundations are mostly about not undoing that: not caching what belongs to one person, not retrying what isn't safe to repeat, not re-encoding what's already encoded, not shipping to the browser what should stay on the server.

A typed client generated from the spec the API already publishes means a breaking API change fails the web app's typecheck in the same PR (ADR 0020), instead of a page at runtime. `openapi-fetch` is a thin typed wrapper around `fetch`, so Next.js still sees every call.

A client data cache (React Query, SWR) solves keeping many browser-side views in sync. With server components and server actions, the server renders the fresh data after each change, which is the App Router's documented pattern.

Retrying only reads keeps the one failure worth hiding, a dropped connection during a Railway deploy, invisible, without the risk of recording "I picked it up" or a Status change twice.

Checking the cookie in the proxy and the session in the layout is what Next.js's authentication guide recommends: the proxy runs on every request and should stay cheap, and only the API knows whether a session is valid.

One Sentry project for both apps keeps one place to look when a Customer reports a problem, and the digest shown on the error page leads, through the web app's log, to the `requestId` and the API's log line for the same request. The tunnel route is Sentry's documented way to keep a strict CSP, and it also keeps events from being dropped by ad blockers.
