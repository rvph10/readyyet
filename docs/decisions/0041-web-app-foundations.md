# 0041: Web app foundations

Date: 2026-09-25

## Decision

- `web/` is a Next.js 16 App Router app, served on port 3001 locally, the `WEB_URL` the API's CORS and Better Auth already trust.
- Styling is Tailwind CSS v4, through its PostCSS plugin. No component library.
- Text goes through next-intl, in English and French, the two `Locale` values Users and emails already have. The locale isn't in the URL: email links are already live as `/t/:code`. Until a page knows better (a signed-in User's `locale`), it's picked from `Accept-Language` by `localeFromAcceptLanguage` in `@readyyet/shared`, the same function the API uses for sign-in emails.
- Security headers are set on every response: a Content-Security-Policy with a fresh nonce per request (`src/proxy.ts`, Next.js's documented setup), and HSTS, `nosniff`, `X-Frame-Options: DENY`, a `strict-origin-when-cross-origin` Referrer-Policy and a Permissions-Policy (`next.config.ts`).
- `web/` builds with TypeScript 7.0.2, like `packages/*`. Checked when scaffolding, per the addendum of ADR 0001: `next build` and `tsc --noEmit` both run on it and both fail on a type error.
- CI has a `web` job: typecheck and build. Linting is the root ESLint config, with the Next.js and React hooks plugins on `web/`.

## Why

Tailwind was chosen over CSS Modules for the speed of building many small screens (dashboard, tracking page, settings) without a stylesheet per component. next-intl is the maintained i18n library for the App Router, and setting it up before the first page means no page is written with hardcoded English. Prefixing URLs with the locale was ruled out because it would break the links already sent in emails, and a Customer's language is a property of their browser, not of a link a shop shares.

The nonce CSP makes every page dynamically rendered. That costs nothing here: the dashboard and the tracking page are per-request data, there is no static marketing site in this app. It's what lets the CSP forbid inline scripts other than the ones Next.js writes itself.

`no-referrer` would also hide the tracking code, but it makes browsers send `Origin: null` on same-origin form posts, which an origin-based CSRF check can't tell apart from a request sent by another site. `strict-origin-when-cross-origin` sends only the origin to other sites, so the code in `/t/:code` still never leaves.
