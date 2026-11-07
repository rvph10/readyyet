# 0010: Resend mail infrastructure

Date: 2026-09-23

## Decision

Mail is sent through Resend (`api/src/email/`), with production-grade
retry and delivery tracking, no product trigger (auth, welcome, ticket
status, news) is wired to it yet, this is infrastructure only.

- `EmailLog` (`packages/db/prisma/schema.prisma`) is one row per logical
  send, not one row per delivery event: `to`, `subject`, rendered
  `html`/`text` content, an app-defined `type` string (not a Prisma enum,
  the actual set of email types, e.g. whether "login" ends up being OTP
  or password reset, is still undecided, a new type shouldn't need a
  migration), `status`, `attempts`, `lastError`, and `lastEvent` (the
  most recent raw webhook payload, for debugging).
- `EmailService.send()` (`api/src/email/email.service.ts`) writes the
  `EmailLog` row as `QUEUED` before calling Resend, so a process crash
  mid-send still leaves a recoverable record, then attempts the send up
  to 3 times in-process with backoff (0ms/500ms/1500ms), skipping retries
  for Resend error names that will never succeed (`validation_error`,
  `invalid_from_address`, `invalid_api_key`, etc.,
  `NON_RETRYABLE_RESEND_ERRORS` in `email-status.ts`) vs. retrying
  transient ones (rate limits, quota, Resend-side errors). Every attempt
  uses the `EmailLog` row's own id as Resend's idempotency key, so a
  retry after an ambiguous failure (we don't know if the first attempt
  actually went through) can't double-send.
- `react` content is rendered to `html`/`text` with `@react-email/render`
  at send time and that rendered output, not the React element, is what's
  persisted, so a later retry (a fresh process, possibly minutes later)
  has real content to resend without needing the original template
  invocation again.
- `EmailRetryService` (`@nestjs/schedule`'s `@Cron("*/5 * * * *")`) sweeps
  `EmailLog` rows still `QUEUED`/`FAILED` with `attempts < 9` and past a
  60s cooldown since `lastAttemptAt`, re-attempting each from its
  persisted content. This is the durable retry path, for anything that
  outlasted the immediate in-process attempts or a crash mid-send.
- `POST /webhooks/resend` (`email-webhook.controller.ts`, public,
  `@AllowAnonymous()`) receives Resend's async delivery events
  (`email.sent`/`delivered`/`bounced`/`delivery_delayed`/`failed`/
  `complained`) and updates the matching `EmailLog` by `resendId`. A
  successful `send()` only means "Resend's API accepted it", delivery
  status only exists via these events.

## Why

Reserving raw `Error` for genuinely unexpected states, not client-facing
`AppError`s, already established by `WorkflowService` (see the ticket/
customer API work), extends naturally here: a send failure is either a
transient thing worth retrying or a dead end worth recording, neither is
a client-facing 4xx, there's no HTTP request driving most sends yet
anyway.

A single `status` field plus `lastEvent` (not a full per-event history
table) is enough to answer "was this delivered", which is the actual
question asked, a full event log is analytics infrastructure nobody's
asked for.

## A real bug this surfaced

`resendClient` was originally constructed eagerly at module-evaluation
time (`new Resend(process.env.RESEND_API_KEY)` at the top of
`resend-client.ts`), the exact `process.env`-at-import-time hazard ADR
0008 already documents for `auth.ts`'s `PrismaClient`, but with a much
wider blast radius here: `AppModule` imports `EmailModule` transitively,
so this crashed the *entire* app (and every e2e test in the suite, not
just email ones) the moment `RESEND_API_KEY` was unset, before anything
had even tried to send an email. Fixed by making construction lazy
(`getResendClient()`, memoized on first real use).

## Raw body handling for the webhook route

`bodyParser: false` is global (`api/src/main.ts`) specifically because
`@thallesp/nestjs-better-auth` re-installs `express.json()`/
`express.urlencoded()` itself for every route except its own
`/api/auth/*` basePath (see ADR 0009). `/webhooks/resend` needed the same
carve-out Better Auth's own routes already have: Resend's webhook
signature verification needs the exact raw bytes, and that library's body
parser would otherwise have silently JSON-parsed the request first.
Fixed the same way pino-http's ordering was fixed: `app.use("/webhooks/
resend", express.raw({ type: "application/json" }))` mounted directly in
`main.ts`, before `app.listen()`, winning the same mounting-order race.
Confirmed empirically against a running server (not just assumed) that
Node's `body-parser` correctly skips re-parsing an already-parsed body
(the `req._body` flag it sets internally), so Better Auth's later
`express.json()` doesn't clobber or hang on the drained stream.
`api/test/support/create-test-app.ts` needed the same mount added, for
the same reason it already re-mounts `pino-http`.

## Known limitation

No product event calls `EmailService.send()` yet. `requireEmailVerification`
stays `false` in `auth.ts`, the user is weighing OTP-based sign-in over
email/password, which would remove the need for a password-reset flow
entirely, that's a separate decision, not part of this one.
