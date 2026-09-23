# 0013: Public tracking endpoint and link expiry

Date: 2026-09-23

## Decision

`GET /tracking/:code` (`api/src/tracking/`) is the only unauthenticated read of a ticket, backing the `readyyet.app/t/[code]` page from ADR 0004. It returns the ticket's title and creation date, the Location's name, contact phone, contact email and logo, the current Status, the ordered steps of the ticket's own (frozen) Workflow, and the Status history with timestamps. Statuses carry their code and every translation, the page picks the locale.

It never returns internal ids, the Customer, who created the ticket or changed a Status, or the ticket's description. The query uses an explicit Prisma `select`, so a column added later is private until someone deliberately adds it here.

A link stops working (404, same as an unknown code) 30 days after the ticket reaches `COMPLETED`, `CANCELLED` or `REJECTED`, measured from the Status event that set it. A ticket that moves back out of one of those Statuses is open again. A soft-deleted Location's tickets also return 404.

The route is rate-limited to 30 requests per minute per client, sends `Cache-Control: no-store`, and the code is masked in request logs (`pino-http-options.ts`).

## Why

The description is free text staff may use for internal notes (prices, remarks about the customer), so it stays private and only the title is shown. The workflow steps let the page show progress and what comes next, not only what already happened. A ticket's history is frozen to its own workflow version (see `docs/architecture/data-model.md`), so these steps can't change under a customer mid-job.

Expiry limits how long a forwarded or leaked link keeps exposing the Location's details and the ticket title, once the customer has no reason to look anymore. Thirty days covers a customer checking back after pickup. The expired response is indistinguishable from an unknown code on purpose, it confirms nothing about the code.

The tracking code is the only thing protecting the page (about 72 bits of randomness, `tracking-code.ts`), so it's handled like a credential: not cached by shared caches, not written to logs. Guessing codes is already impractical, the rate limit is abuse protection, not the security boundary.

## Known limitation

Nest's `ThrottlerGuard` keys on `req.ip`. Behind Railway's proxy, without Express's `trust proxy` configured, that's the proxy's address, so every visitor would share one bucket and 30 requests a minute would be the limit for everyone together. This is the same unresolved client-IP question ADR 0009 records for Better Auth, and gets fixed with it after the first deploy, once the real `x-forwarded-for` shape on Railway is known. It must be fixed before this endpoint takes real traffic.
