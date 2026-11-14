# 0156: Sentry reports only from Railway

Date: 2026-11-14

## Decision

The API and the web app send nothing to Sentry unless they run on Railway, whatever DSN is set. The API checks `RAILWAY_ENVIRONMENT_NAME`, the web app the `SENTRY_ENVIRONMENT` its build inlines, which falls back to `development` off Railway. This replaces ADR 0019's "optional locally, events are then tagged `development`".

The high priority alert rule in Sentry only fires for `production`.

## Why

A DSN copied into a local `api/.env` sent every development error to the one production project: 3.5K events in a single issue, mixed in with the real ones and able to page through the alert rule. Gating on the platform rather than on the DSN keeps a local `.env` harmless.
