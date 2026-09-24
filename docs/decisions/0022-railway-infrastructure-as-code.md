# 0022: Railway configured by Infrastructure as Code, staging before production

Date: 2026-09-24

## Decision

- The Railway project (`readyyet`) is described by `.railway/railway.ts`, Railway's Infrastructure as Code, for both environments: the `api` service's source, build, pre-deploy, start and healthcheck settings, its variables, and a Postgres per environment. `api/railway.json` is gone.
- Both environments run in Railway's EU West region (`europe-west4-drams3a`, Amsterdam), pinned in the file: customer data stays in the EU, like Sentry's (ADR 0019). Railway's default region was US West.
- Two environments: `staging` deploys the `staging` branch, `production` deploys `main`. Work lands on `staging` first, releasing is merging `staging` into `main`. CI runs on both branches, and Railway only deploys a commit once CI has passed on it.
- The file is applied by hand, `railway config plan` then `railway config apply`, per environment, after it changes. Not from CI for now.
- Secrets, and values that differ per environment, are set in Railway and only declared in the file as kept (`preserve()`). The repo is public.
- The `railway` package that evaluates the file is a pinned root dev dependency.

## Why

Railway deprecated Config as Code (`railway.json`): a new service can't use it, and existing files stop being read on 2026-12-01. The project had no services yet, so there was nothing to migrate, only a file to write.

Infrastructure as Code isn't applied on deploy the way `railway.json` was, someone has to run `apply`. Doing it from CI (Railway's `railwayapp/config` action) needs a project token per environment stored in GitHub, and the file will rarely change once the service exists. By hand is enough until it changes often, the action can take over then without changing the file.

The file describes the whole project: a resource missing from it is deleted on the next apply. That's why every service goes in this one file, and why `plan` is always read before `apply`.

A staging environment catches a failed migration, a missing variable or a broken build before production does, on a real Railway deploy with its own database.
