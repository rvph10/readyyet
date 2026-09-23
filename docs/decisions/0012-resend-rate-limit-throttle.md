# 0012: Throttle Resend calls, run api test files sequentially

Date: 2026-09-23

## Decision

Every Resend API call waits for a slot from `waitForResendSlot()` (`api/src/email/resend-client.ts`), which spaces request starts at least 120ms apart (about 8 per second). The throttle is module-level, so the Nest-injected `EmailService` and the one `auth.ts` constructs directly share one budget. The api test suite runs one file at a time (`fileParallelism: false` in `api/vitest.config.ts`).

## Why

Resend allows 10 requests per second per team and answers `rate_limit_exceeded` above that. ADR 0010 treats that error as retryable, but retrying is the wrong tool for a limit we can simply stay under: a burst of sends burns attempts and backoff delays for every email in it. This surfaced in the e2e suite, where parallel test files (every OTP sign-in sends a real email) pushed well past the limit and made `email-retry.e2e.test.ts` time out.

The throttle only coordinates within one process. That matches the current single API instance. Running more instances would need a shared limiter (for example in Postgres or Redis), not worth building before then. For the same reason, the tests can't rely on it across Vitest's per-file worker processes, hence sequential files, which roughly doubles the suite's run time (about 14s to 28s locally).

The limit also applies across everything using the same API key, so local test runs and CI sharing one key can still collide. Separate keys per environment avoid that.
