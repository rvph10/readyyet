# 0159: The API runs as one instance

Date: 2026-11-15

## Decision

The `api` service runs exactly one replica, in both environments (`replicas` in `.railway/railway.ts`). Raising it is not a setting change: it needs the work listed below first, recorded in a new ADR.

Deploys keep it at one too: the API gets draining time, never overlap (`deploy` in `.railway/railway.ts`), so an old and a new container never both run its jobs. The web app and the site hold no such state and could run more.

## Why

Several parts of the API count on being the only one running:

- **Scheduled jobs.** The email retry sweep, the Ticket-created, status, ready date and reminder emails, trial reminders, sponsor credits, photo expiry, orphan image cleanup and retention all run on a `@Cron` in every instance, and none takes a lock. Two instances would both pick the same rows, so a Customer could get the same email twice. Fixing it means a Postgres advisory lock per job, or `FOR UPDATE SKIP LOCKED` on the rows each one picks.
- **Rate limits in memory.** The per-IP limits of `@nestjs/throttler` (ADR 0009) and Better Auth's sign-in limits, the hourly export limit (`location-export.ts`) and the daily Google search limit (`location.service.ts`) are counted in the process. With N instances, each limit is N times higher. Fixing it means a shared store, Postgres or Redis.

One instance is plenty at today's traffic, and Railway restarts it on a crash. A second one would add those fixes for availability we don't need yet. ADR 0026 already chose a bucket over a volume partly so that a second replica stays possible.
