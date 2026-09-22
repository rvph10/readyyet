# 0009: Rate limiting and request logging

Date: 2026-09-22

## Decision

Rate limiting is split across two mechanisms, not one:

- Better Auth's own built-in `rateLimit` (`api/src/auth/auth.ts`), explicitly
  enabled (it's off by default outside production) at 100 req/min globally
  with `customRules` tightening `/sign-in/email` and `/sign-up/email` to
  5 req/min each.
- `@nestjs/throttler`, registered as a global guard (`APP_GUARD` in
  `AppModule`) at 60 req/min, for every route Nest itself controls.
  `HealthController` opts out with `@SkipThrottle()`.

Request logging uses `nestjs-pino`. `pino-http` is mounted directly on the
raw Express app in `main.ts` (`app.use(pinoHttp(...))`, right after
`NestFactory.create()`), not through `LoggerModule`'s own middleware
registration. `LoggerModule.forRoot({ pinoHttp: ..., useExisting: true })`
in `AppModule` only wires the AsyncLocalStorage context for injectable
`Logger`/`PinoLogger`, reusing that same `req.log` rather than creating a
second pino-http instance. Every request gets an ID (reused from an
incoming `x-request-id` header, or generated) echoed back as a response
header, and `AppExceptionFilter` logs unexpected errors via the request's
own `req.log`. `ApiErrorResponse` (`packages/shared`) carries that same ID
as `requestId`.

## Why

`@thallesp/nestjs-better-auth` mounts Better Auth as raw Express middleware:
`AuthModule.configure()` calls `this.adapter.httpAdapter.use(authHandler)`
directly on the underlying Express instance, not via Nest's
`MiddlewareConsumer`. Its routes are fully handled and responded to before
Nest's own routing/guard pipeline ever runs, so a Nest-only rate limiter
would do nothing for exactly the endpoints, sign-in and sign-up, that most
need brute-force protection. Better Auth's own rate limiter is the only
thing that actually sees that traffic; `@nestjs/throttler` covers
everything else.

The same fact broke the first attempt at request logging: `LoggerModule`
registered through the normal Nest module system (`configure()` +
`consumer.apply().forRoutes()`) lost the ordering race against
`AuthModule`'s direct `httpAdapter.use()` call regardless of `imports`
array order — verified by curling `/api/auth/get-session` and finding no
`x-request-id` header, while `/health` (a real Nest-routed controller) had
one. Nest's module `configure()` hooks only run later, inside
`app.listen()`'s internal init, by which point `AuthModule` had already
registered its handler directly. Mounting `pino-http` manually right after
`NestFactory.create()` sidesteps the ordering question entirely: it's
attached to Express before any module's `configure()` can run.

## Known limitation

Better Auth logs a warning that it can't resolve a per-request client IP
in this setup, and falls back to a single shared rate-limit bucket per
path rather than per-IP. One client maxing out `/sign-in/email` would
temporarily rate-limit everyone hitting that path, not just them. Fixing
this needs `advanced.ipAddress.trustedProxies`/`ipAddressHeaders`
configured to match however Railway actually forwards the client IP in
production, not guessed at locally. Left as a follow-up.
