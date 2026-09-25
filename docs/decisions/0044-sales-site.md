# 0044: Sales site

Date: 2026-09-25

## Decision

- The pages that sell ReadyYet (home, business types, pricing, FAQ, legal) are their own Next.js app, `site/`, next to `web/` in the monorepo. `site/` serves `readyyet.app`, and `web/` serves `app.readyyet.app` (ADR 0043).
- Signing in and signing up happen on `app.readyyet.app`. The site only links there.
- The site is in English, French and Dutch, with the language in the URL: `/en`, `/fr`, `/nl`. `/` sends the visitor to their browser's language, English when it's none of the three. Pages are rendered at build time.
- It uses the same logo, fonts (Geist Sans and Geist Mono) and lime as the web app, copied, not shared through a package.
- Its Content-Security-Policy allows inline scripts (`'unsafe-inline'`) instead of using a nonce. The other security headers are the web app's.
- It sets no cookies: next-intl's language cookie is off, the URL already carries the language.
- Locally it runs on port 3002. CI typechecks and builds it in its own `site` job.

## Why

The two apps want opposite things. Sales pages should be static files, quick to load and easy for search engines to index, with a URL per language so each one is indexed. The web app renders every request because of its nonce CSP (ADR 0041), and keeps the language out of its URLs because email links to it are already live. One app would have to fight one of those setups on every page. Separate apps also let the marketing text change without a product deploy.

Sign-in stays in the web app because its session cookie and every page that reads it live there. The site then has no session, no forms and no user data, which is also why `'unsafe-inline'` is acceptable here: a nonce needs a request to be generated for, and a page built once has none, while an injected script on the site would find nothing to read or act on.

Without cookies, every response is the same for everyone, so a CDN can cache the pages as they are.

Dutch is on the site from the start because ReadyYet is sold in Belgium, where Flanders speaks it. The web app and emails are in English and French only for now. Adding Dutch there means a new `Locale` value in the database, so it's a change of its own.

The design tokens are a handful of lines, not worth a shared package until the two apps share components.
