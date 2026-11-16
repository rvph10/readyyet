import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Migrations run before the new release takes traffic, while the old one
// still serves (preDeploy in .railway/railway.ts). One waiting for a lock
// a long query holds would queue every later query on that table behind
// it, the whole app stalls. Past 5 s it fails instead, the deploy stops and
// the old release keeps running. Recovering takes `prisma migrate resolve`
// before the next deploy, see docs/operations/backups-restores-and-rollbacks.md.
// PGOPTIONS isn't read by Prisma's migration engine, the URL's options
// parameter is.
const url = new URL(env("DATABASE_URL"));
url.searchParams.set("options", "-c lock_timeout=5s");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: url.toString(),
  },
});
