# 0011: Email OTP replaces password auth

Date: 2026-09-23

## Decision

`emailAndPassword` (ADR 0008) is removed entirely. Sign-in is now Better
Auth's `emailOTP` plugin (`api/src/auth/auth.ts`): `POST /api/auth/
email-otp/send-verification-otp` (`{ email, type: "sign-in" }`) emails a
6-digit code (5 min expiry, 3 verify attempts, all plugin defaults, not
overridden), `POST /api/auth/sign-in/email-otp` (`{ email, otp, name? }`)
verifies it and sets the session cookie, the same mechanism the password
flow already used. There is no password anywhere in this app anymore, no
password-reset flow, and no separate signup endpoint: if the email has no
`User` yet, sign-in creates one (`disableSignUp` left at its default,
`false`), `emailVerified: true` is set automatically since the OTP itself
already proves ownership. One flow covers both new and returning users.

`api/src/auth/auth.ts`'s `sendVerificationOTP` callback only actually
sends an email for `type: "sign-in"`. The plugin also exposes
`email-verification`/`forget-password`/`change-email` OTP types (their
routes stay technically reachable regardless), nothing in this app calls
them, `forget-password` in particular is meaningless with no password to
reset. The callback no-ops for anything else rather than trying to
disable routes Better Auth doesn't provide a clean per-type toggle for.

`rateLimit.customRules` (ADR 0009) now targets `/sign-in/email-otp` and
`/email-otp/send-verification-otp`, both at 10 req/min per IP (up from
the old password flow's 5). The primary defense against brute-forcing a
single OTP is the plugin's own per-identifier `allowedAttempts: 3`, not
this path-level counter, this is a coarser abuse/DoS ceiling on top of
it, loosened from 5 specifically because this app's own e2e test suite
(multiple legitimate sign-in flows per test file, all sharing one IP)
needed the headroom, not because 5 was found to be a real production
problem.

## Why

The user's own reasoning: OTP confirms the email as a side effect (no
separate verification step needed) and removes the need to ever build a
password-reset flow, both real complexity this app doesn't need to
carry. Auto-registration on first sign-in (rather than a distinct signup
call) mirrors the onboarding shape already built (`GET /me` routes a
user by whether they hold memberships, not by how they authenticated).

## `EmailService` needed to become callable outside Nest's DI

`auth.ts` is evaluated outside Nest's DI container entirely, at module
load time (ADR 0008's own "real bug" section already documents this).
Sending the OTP email through the same retrying, logged, delivery-tracked
`EmailService` (not a bare Resend call bypassing all of that
infrastructure) required widening its constructor's declared dependency
type from `PrismaService` to the base `PrismaClient` (`api/src/email/
email.service.ts`), since `auth.ts` already has its own separately-
constructed `PrismaClient` and isn't part of Nest's container. Nest's
own DI resolves by exact class token, not by supertype, so
`@Inject(PrismaService)` on that same constructor parameter still tells
Nest which concrete provider to hand in, the type widening and the DI
token are two independent things. `new EmailService(prisma)` in `auth.ts`
then just works, no Nest DI needed for that call site at all.

## A real TypeScript bug this surfaced

`export const auth = betterAuth({...})` failed to typecheck once the
`emailOTP` plugin was added: `TS2883, "The inferred type of 'auth'
cannot be named without a reference to '$strip' from
.../zod/v4/core. This is likely not portable."`. The plugin's zod-based
route schemas make the fully-inferred return type reference an
unexported zod internal that TypeScript can't safely emit a declaration
for. Fixed with an explicit `Auth<any>` annotation (`better-auth`'s own
exported helper type for exactly this situation), not the bare `Auth`
default: that hits a separate, real generic-variance mismatch in Better
Auth's own types between the specific inferred `Options` and the bare
`BetterAuthOptions` default. Nothing in this codebase calls `auth.api.*`
directly (only `AuthModule.forRoot({ auth })` uses this export), so
`Auth<any>` loses no precision actually relied on.

## Schema

No change. `emailOTP` uses only the existing `User`/`Session`/
`Verification` tables (all already Better-Auth-owned per ADR 0008).
Confirmed by actually re-running `better-auth generate` against the
updated config and diffing the result, not assumed, per ADR 0008's own
established practice, the diff was purely cosmetic (3 blank lines from
the generator's own formatting), reverted.

## Testing

The OTP itself lives in the `Verification` table under identifier
`"sign-in-otp-<email>"`, value `"<otp>:<attempts>"` (plain text, the
default `storeOTP`), confirmed by reading the plugin's own source, not
just its docs. `api/test/support/sign-in-via-otp.ts` reads it directly
via `PrismaService` rather than intercepting the email, the same "hit
the real dependency, don't mock" preference already used for Resend's
own test-mode addresses elsewhere in this suite. Every e2e test's old
`signUp(app, email)` helper (password-based) is replaced by this one
call, since sign-in-with-OTP now covers what used to be two separate
steps.
