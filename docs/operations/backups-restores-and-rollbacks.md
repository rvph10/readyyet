# Backups, restores and rollbacks

What protects production's data, how to get it back, and how to undo a bad deploy. Written 2026-11-15 from what Railway actually has configured, not from defaults. Check it again with the commands under each heading before relying on it.

Commands use the Railway CLI from the repo root. If its version check complains, run it as `_=$HOME/.railway/bin/railway ~/.railway/bin/railway ...`.

## What is backed up

### Production Postgres

| What                                                                                        | When                                                      | Kept                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| Point-in-time recovery (WAL archived continuously to the `Postgres-PITR` bucket, Amsterdam) | Continuous, plus a base backup every day around 12:20 UTC | See the restore test below |
| Daily backup of the volume                                                                  | 15:14 UTC                                                 | 6 days                     |
| Weekly backup of the volume                                                                 | Saturday 20:25 UTC                                        | 27 days                    |
| `pre-release-<commit>` backup, taken by hand before each release                            | Before promoting `staging` to `main`                      | Until deleted by hand      |

The `Postgres-PITR` bucket is declared in `.railway/railway.ts` for production only. Left undeclared, a `config apply` would delete it.

The `pre-release-*` backups never expire. Delete the ones older than the last few releases now and then, they cost storage.

Check:

```sh
railway postgres pitr status -s postgres -e production
railway postgres pitr schedule list -s postgres -e production
railway postgres pitr backup list -s postgres -e production
```

### Staging Postgres

Daily at 00:47 UTC (6 days) and weekly on Saturday at 09:43 UTC (27 days). No point-in-time recovery.

### Not backed up

The `images` bucket (Ticket photos, logos, avatars, ADR 0026) has no backup. A deleted or overwritten object is gone. The database only holds the objects' keys.

## Before a release

Take a named backup, then promote:

```sh
railway postgres pitr backup create --name pre-release-<short commit> -s postgres -e production
```

## Restoring the database

Pick the gentlest way that does the job.

### 1. Point in time, into a new service (production only)

Never touches the running database: Railway creates a new Postgres service (`postgres-restored-<date>` unless named) in the same environment, recovered to the moment asked for, while production keeps serving.

```sh
railway postgres pitr restore -s postgres -e production --at 2026-11-15T13:30:00Z
# or relative: --at 30m
```

Then, depending on what went wrong:

- **Some rows were lost or damaged:** read them from the restored service (`railway connect <restored service> -e production` opens psql) and write them back into production by hand or with `pg_dump --data-only -t <table>` into the live database. The cutover is then nothing more than that copy.
- **The whole database is bad:** the API's `DATABASE_URL` comes from the `postgres` service in `.railway/railway.ts`. Point it at the restored service there, `config plan`, `config apply`, and the API redeploys onto it. Rehearse this on staging first, it hasn't been done yet.

Delete the restored service once done. It isn't in `railway.ts`, so the next `config apply` would also delete it.

### 2. A volume backup (staging, or when point in time can't help)

Restoring a backup replaces what's live: in the database's Backups tab, Restore mounts the backup as a new volume in place of the current one, which stays in the project unmounted. Everything written since the backup is no longer what the database serves.

```sh
railway postgres pitr backup list -s postgres -e <environment>
railway postgres pitr backup restore <backup id> -s postgres -e <environment>
```

Railway stages it, review the change and Deploy it in the dashboard. For production, take a fresh backup first.

## Rolling back a deploy

In Railway, open the service (api, web or site), Deployments, the three dots on the last good deployment, **Rollback**. It brings back that deployment's image and its variables as a new deployment, without building. The CLI has no rollback, only `redeploy` of the latest.

- It only works within the plan's image retention: 120 hours on Pro. Older than that, revert the commit instead.
- It brings back the variables of that deployment too. A variable changed since (a rotated key) goes back to its old value.
- It doesn't undo database migrations. See the rule below.
- It doesn't change the code on `main`: the next deploy brings the bad commit back. Revert it on `staging` with a PR, then promote, as for any change (ADR 0023).
- Each service rolls back on its own. If api and web changed together, roll back both.

## The rule that makes rollbacks safe

Migrations run in the API's pre-deploy step, before the new code takes traffic, and are never undone. While a deploy overlaps, and after any rollback, the previous release's code runs against the new schema. So every migration must work with the code of the release before it:

- **Forward only.** No down migrations. To undo one, write a new migration.
- **Expand, then contract.** Add a column, table or index in one release; stop using the old one in the code; drop it in a later release. `location.logo_key` was kept through one release (`20260928090000_business_logo_and_declined_invitations`) and dropped in a later one (`20261113120000_drop_location_logo_key`).
- **Nothing the old code would break on.** A new required column needs a default or a trigger that fills it, as the Ticket number does (`20261114090000_ticket_number`), since the old API inserts without knowing it.
- **Rename in three steps.** Add the new column, write both, read the new one, then drop the old one. Never rename in place.

A migration that destroys or rewrites data can only be undone by restoring the database, so it gets its own release, after a `pre-release-*` backup.

## Restore tests

Run one every few months, and after any change to the backup setup. Record it here.

| Date | What | Result |
| ---- | ---- | ------ |
