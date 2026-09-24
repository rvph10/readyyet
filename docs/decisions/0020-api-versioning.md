# 0020: API versioning

Date: 2026-09-24

## Decision

The API has no version in its URLs or headers while its only client is our own web app.

- A change the web app doesn't depend on yet (a new endpoint, a new response field, a new optional request field) ships at any time.
- A breaking change (a field removed or renamed, a type or status code changed, a request field made required) ships in the same PR as the web app's update to it. `api/openapi.json`'s diff makes it visible in review, the PR says it's breaking.
- The API and the web app deploy as separate Railway services, so for a minute or two the old web app talks to the new API. A breaking change the live web app relies on is split in two deploys instead: first add the new shape next to the old one, then remove the old one once the web app no longer uses it.

The first client we don't deploy ourselves ends this: a mobile app (old versions stay installed), a partner integration, or public API access. Then:

- Routes move under `/v1` (Nest's URI versioning), and `/v1` only ever gets additive changes.
- A breaking change becomes `/v2`, and the old version gets a `Deprecation` and `Sunset` header and a date announced to its users before it's removed.
- CI adds a breaking-change check of `api/openapi.json` against `main` (oasdiff), failing on any unannounced break.

## Why

A version number is a promise to clients we can't update. We have none: the web app is ours, and it can change in the same PR. Versioning now would mean keeping old versions alive for no one, and `/v1` in every URL of the web app for a promise nobody holds us to.

The two-deploy rule covers the one real gap, the window where both versions of the web app are live. It's the standard expand-and-contract migration, the same one used for database changes.
