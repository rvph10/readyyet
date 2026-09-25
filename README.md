# readyyet

ReadyYet lets businesses that take in physical items for work (repairs, cleaning, etc.) give their customers a way to track progress, without phone calls and without the customer needing an account.

Status: early development. The API is built, the web app is being scaffolded.

## Stack

NestJS API (`api/`) + Next.js web app (`web/`, Tailwind, next-intl) + Postgres via Prisma (`packages/db/`) + Better Auth (email OTP, no passwords) + Resend for transactional email. See `docs/decisions/0001-stack-and-repo-structure.md` for why, and `docs/` generally for the reasoning behind everything else, this README only covers running the thing.

## Prerequisites

- Node (version pinned in `.nvmrc`)
- pnpm (version pinned in `package.json`'s `packageManager`)
- Docker, for local Postgres

## Setup

```bash
pnpm install

# Postgres
docker compose up -d

# api/.env, from api/.env.example
cd api
cp .env.example .env
```

Fill in `api/.env`. The API checks these when it starts and refuses to start if one is missing or malformed (`api/src/config/env.ts`).

- `DATABASE_URL`, `PORT` — already correct for the `docker compose` setup above, no change needed.
- `BETTER_AUTH_SECRET` — generate with `pnpm exec better-auth secret`.
- `BETTER_AUTH_URL` — `http://localhost:3000` locally. It's the API's own public URL, also used for the one-click stop link in customer emails.
- `RESEND_API_KEY` — from [resend.com/api-keys](https://resend.com/api-keys). The email e2e tests hit the real Resend API using its test-mode addresses (`delivered@resend.dev`, `bounced@resend.dev`), a real key is required for `pnpm test` to pass, not optional.
- `RESEND_WEBHOOK_SECRET` — only needed to receive real delivery-status webhooks (see `docs/decisions/0010-resend-mail-infrastructure.md`), not needed for local dev or tests.
- `EMAIL_FROM` — a sender address on a domain verified in Resend.
- `SUPPORT_EMAIL`: a monitored inbox. Security emails (an ownership transfer, a deleted account) tell the User to reply if it wasn't them, and replies go here.
- `WEB_URL` — the web app's origin, `http://localhost:3001` locally. It's the only origin allowed by CORS and by Better Auth's `trustedOrigins`, and the base for links in emails.
- `NODE_ENV`, `LOG_LEVEL` — defaults are fine locally.
- `SENTRY_DSN`: optional locally, from the Sentry project's Client Keys. Set, your errors show in Sentry under the `development` environment. Required in production, see ADR 0019.

Then, from the repo root:

```bash
pnpm --filter @readyyet/db run migrate:dev
pnpm --filter @readyyet/db run seed
pnpm --filter @readyyet/api run start:dev
pnpm --filter @readyyet/shared run build   # the web app imports its compiled output
pnpm --filter @readyyet/web run dev        # http://localhost:3001
```

## Testing

```bash
pnpm --filter @readyyet/db run test
pnpm --filter @readyyet/api run test
pnpm lint
pnpm format:check   # or pnpm format to fix
```

Both run against the real local Postgres from `docker compose`, not a mock. The `api` e2e suite also checks every JSON response against `api/openapi.json` (`api/test/support/openapi-contract.ts`), so regenerate the spec before running it after changing a DTO. The `api` suite also sends real (test-mode) emails through Resend, `RESEND_API_KEY` has to be set. Its test files run one at a time to stay under Resend's rate limit, see ADR 0012. Any address a test sends to must be one of Resend's test addresses (`delivered+<label>@resend.dev`, `bounced@resend.dev`): they go through the real API but are never delivered, so they can't bounce and hurt the sending domain's reputation.

## CI

`.github/workflows/ci.yml` runs five jobs: `audit` (known vulnerabilities in any dependency, high severity and up), `lint` (ESLint and Prettier), and `shared`, `db`, `api`, the last two against a fresh Postgres service container each.

- An advisory that can't reach the running API can be ignored in `pnpm-workspace.yaml`'s `auditConfig`, with the reason next to it. Dependabot (`.github/dependabot.yml`) proposes updates weekly, a week after each release.

- The `api` job needs `RESEND_API_KEY` set as a GitHub Actions repo secret (Settings → Secrets and variables → Actions), for the same reason `pnpm test` needs it locally. Without it, that job fails with a "missing API key" error.
- The `api` job also runs `pnpm --filter @readyyet/db run seed` before tests, not just `migrate deploy`. Migrations alone don't populate the `BusinessType`/`Status` catalogue that several tests depend on, only the seed script does.

## Deploy

The API runs on Railway, project `readyyet`, with two environments: `staging` deploys the `staging` branch, `production` deploys `main`, and only commits that passed CI can reach either branch. Changes go to `staging` first, by a squash-merged PR. Releasing is a PR from `staging` into `main`, merged once staging runs that exact commit and `/health` answers 200 (the `promotion` job), see ADR 0023.

Both environments are described by `.railway/railway.ts` (Railway Infrastructure as Code, see ADR 0022): the `api` service, its settings and variables, and a Postgres per environment. Railway doesn't read it on deploy, after changing it, apply it to each environment with the [Railway CLI](https://docs.railway.com/cli):

```bash
railway link                    # once, pick the readyyet project
railway environment staging     # then production
railway config plan             # review, then
railway config apply
```

Production answers on `api.readyyet.app`. Railway's IaC can't register a custom domain, so it's attached to the production `api` service in Railway, with the CNAME Railway gives added at the DNS provider. Staging keeps the domain Railway generates.

Secrets, and values that differ per environment, stay in Railway, never in the file, the repo is public: `BETTER_AUTH_SECRET`, `WEB_URL`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `SUPPORT_EMAIL` and `SENTRY_DSN` (see `api/.env.example`). The file only says they must be kept. The API refuses to start without them.

Each deploy builds `@readyyet/db`, `@readyyet/shared` and the API, then runs `prisma migrate deploy` and the catalogue seed (it only adds what's missing) before starting the new version. Node starts with `--enable-source-maps`, so stack traces in logs and Sentry point at the TypeScript sources. Traffic switches over once `/health` answers 200. Railway only calls `/health` during a deploy, it doesn't restart a running service on it.

After the first deploy, do the trusted-proxy check at the end of ADR 0009.

## Docs

- `docs/decisions/` — numbered ADRs, the reasoning behind every real architectural/product decision.
- `docs/domain/` — domain vocabulary (`glossary.md`) and the status/business-type catalogue.
- `docs/architecture/data-model.md` — schema reasoning: id strategies, constraints Prisma can't express, transaction boundaries.
- `docs/architecture/api-conventions.md`: the rules every endpoint follows, routes, status codes, ids, pagination, errors, rate limits.
- `/docs` (Swagger UI, non-production only, `api/src/main.ts`) — the live API reference, generated from the actual controllers and DTOs. Better Auth's own routes (`/api/auth/*`) aren't in it, they're raw middleware, not Nest controllers, see ADR 0008/0011.
- `api/openapi.json` — the same spec as a committed file, so every API change shows up in review. Regenerate it with `pnpm --filter @readyyet/api run openapi` after changing a controller or DTO, CI fails if it's out of date.

## License

Source-available under the PolyForm Noncommercial License 1.0.0. See [LICENSE](LICENSE). Viewing and noncommercial use are permitted, commercial use requires a separate agreement.
