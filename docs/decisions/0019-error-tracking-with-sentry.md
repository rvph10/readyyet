# 0019: Error tracking with Sentry

Date: 2026-09-24

## Decision

Unexpected errors in the API are reported to Sentry (`@sentry/nestjs`, initialised in `api/src/instrument.ts`, loaded first by `main.ts`).

- An HTTP request is reported only when `AppExceptionFilter` answers it with a 500. A 4xx is the API working as designed, including a database race it maps to 409 or 404.
- An error thrown by a `@Cron` job is reported by the SDK itself. `@nestjs/schedule` would otherwise only log it.
- An event carries a failing request's method and path, nothing else. Even without `sendDefaultPii`, the SDK sends the request body, query string, headers and client IP by default, and ours carry customer names, emails, phone numbers and search terms. A tracking code in the path gives access to a ticket (ADR 0004), so it's masked there and in the transaction name, the same way the request logs mask it.
- A Prisma validation error's message quotes the whole failing query, argument values included, whatever `errorFormat` is set. Only its first line (the call) and last line (what's wrong) are sent.
- `SENTRY_DSN` is required in production, where the API refuses to start without it, and unset everywhere else, where the SDK does nothing.
- Errors only, no performance tracing for now.

## Why

A 500 was only a log line, and Railway's logs aren't something anyone watches. Sentry is the usual choice for a NestJS API, has an official SDK that also covers scheduled jobs, and its free tier covers this stage.

Pinned to 11.0.0, a major version released the day before: the 10.x line doesn't support NestJS 12. Checked end to end before adopting it, against a local stand-in for Sentry's ingest endpoint: a 404 sends nothing, a 500 and a failing cron job each send one event with environment and release set, and a 500 on a POST with customer data in its body and query sends none of it.

Tracing would add request spans to every call and URLs to mask in more places, for latency numbers nobody needs before there's real traffic.
