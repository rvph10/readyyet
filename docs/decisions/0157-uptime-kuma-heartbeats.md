# 0157: Uptime and job heartbeats in Uptime Kuma

Date: 2026-11-14

## Decision

Sentry stays on its free plan, which monitors one cron job (`customer-status-emails`) and one URL (`api.readyyet.app/health`). Everything else is watched by the Uptime Kuma instance already running on our own server (`status.lab.upintown.dev`), alerting through its existing notification:

- HTTP checks every minute on `api.readyyet.app/health`, `app.readyyet.app/health` and `readyyet.app`.
- Push monitors for `email-retry-sweep`, `ticket-created-emails` and `retention`. The `@Heartbeat` decorator pings `${UPTIME_PUSH_URL}-<name>` after a run finishes, so a run that throws, or never starts, lets the monitor go down. `UPTIME_PUSH_URL` is set in production only. The ping isn't awaited and a failed one is only logged: the monitor being unreachable mustn't hold back or fail a run.

The push monitors stay paused in Kuma until the first production deploy that sends heartbeats, so they don't alert in the meantime.

## Why

The health check found 9 of 10 Sentry cron monitors disabled and only the API covered by uptime. Sentry's free plan has no pay-as-you-go budget: more monitors start with the Team plan at $29 a month, too much for monitors alone before there are paying customers. Kuma was already running and monitoring other sites, does both HTTP and push checks, and costs nothing more.

Kuma runs on a single server: if that server goes down, these checks stop with it. Sentry's API uptime check, on separate infrastructure, still covers the most important URL in that case.
