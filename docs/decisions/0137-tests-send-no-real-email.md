# 0137: Tests send no real email

Date: 2026-11-12

## Decision

The api test suite never calls Resend's sending API. `api/test/support/resend-setup.ts` replaces `emails.send` on the Resend client for every test file: it accepts every send and returns a new id, as Resend does for its `@resend.dev` test addresses. Tests that need a refusal or a failure spy on `emails.send`, as they did. Webhook signatures are still checked by the real client, which needs no network.

CI no longer has the real `RESEND_API_KEY`, only a placeholder of the right shape, and `pnpm test` runs without one.

This replaces the parts of ADR 0010 and ADR 0012 where the e2e tests send through the real API. The throttle of ADR 0012 stays, and so do sequential test files, as they share one database.

## Why

Resend counts sends to its test addresses against the plan. A full suite run sent several hundred emails (every OTP sign-in, Ticket and invitation), and CI runs it on every push to a pull request: on 2026-11-12 the plan was 80% used. Parallel CI runs also shared Resend's per-team rate limit, which made unrelated pull requests fail on timeouts. What the tests check is our handling of Resend's answers, which a fake gives as well (user decision, 2026-11-12).
