# 0001: Stack and repo structure

Date: 2026-09-21

## Decision

- API: NestJS (TypeScript)
- Frontend: Next.js (TypeScript)
- Database: Postgres, accessed through Prisma
- Auth: Better Auth, cookie-based sessions between the separate API and frontend
- Billing: Stripe
- Transactional email: Resend
- Hosting: Railway
- Repo: single pnpm monorepo with `api/`, `web/`, and a shared package for types/constants used by both

## Why

Separate API and frontend were chosen over a single Next.js full-stack app for a clearer boundary between the domain logic (multi-tenant permissions, workflow engine, billing) and the UI. NestJS gives structured modules, guards, and dependency injection, a good fit for shop-scoped permission checks. Postgres and Prisma are the standard, well-documented choice for this kind of relational, multi-tenant data model. Better Auth avoids hand-rolling sessions, invites, and password handling. A pnpm monorepo keeps shared types (status enums, roles, DTOs) in one place instead of duplicated across two repos.

## Addendum: TypeScript version differs per package

`packages/db` uses TypeScript 7.0.2 (plain `tsc`, confirmed empirically to still emit `emitDecoratorMetadata` correctly despite the ongoing native-compiler rewrite). `api/` is pinned to TypeScript 6.0.3 instead, `@nestjs/cli`'s build process depends on the TS programmatic compiler API, which TypeScript 7.0 dropped (confirmed by `nest build`'s own error message, restoring it is planned for 7.1). Worth checking again when scaffolding `web/`, Next.js's build tooling may have the same constraint.
