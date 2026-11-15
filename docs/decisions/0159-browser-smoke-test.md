# 0159: A browser smoke test of the main path

Date: 2026-11-15

## Decision

One Playwright test, `web/e2e/smoke.spec.ts`, walks the path a new shop takes in a real browser: sign in with the emailed code, create a Business and its first Location, create a Ticket for a new Customer, move it to the next Status, then open the tracking page signed out and see the new Status. It runs against the built API (`api/dist/main.js`) and web app (`next start`), which `web/playwright.config.ts` starts, in Chromium only, in English. Locators are roles and labels, as a user reads the page, never test ids.

`@playwright/test` is the only dependency added, pinned to an exact version like every other.

No email leaves. The Resend client reads `RESEND_BASE_URL`, which points the API at `web/e2e/email-sink.mjs`: a small `node:http` server that accepts `POST /emails` like Resend and keeps what it received, which the test reads for the sign-in code and the Ticket's link. It answers anything else with a 404 and logs it, so a new kind of Resend call shows up rather than reaching Resend. `RESEND_API_KEY` is a placeholder. This extends ADR 0137 to the browser test.

Locally the API uses its own database, `readyyet_e2e`, created and seeded once. A dev API on the shared `readyyet` database picks up queued emails it finds there and sends them through the real key in `api/.env`: during setup it sent one of the test's Ticket emails that way. CI uses its fresh service database.

The `e2e` job in `ci.yml` runs on every pull request, uploading the report and traces when it fails. It isn't a required check yet: it becomes one once it has proven stable.

## Why

The api e2e suite tests the API and the web Vitest suite tests helpers in isolation. Neither notices the web app and the API no longer agreeing, a page that stops rendering, or a button that does nothing, which is what a shop would hit first. One flow covers the path that has to work for ReadyYet to be any use, and stays fast and readable; more flows can follow where a real regression shows one is needed.

A required check that fails for reasons unrelated to the change blocks every pull request, so it starts as advice only.
