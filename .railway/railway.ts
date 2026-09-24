import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

// Not applied on deploy: run `railway config plan` then `railway config apply`
// once per environment after changing it (ADR 0022).

// EU West (Amsterdam): customer data stays in the EU, like Sentry's (ADR 0019).
const REGION = "europe-west4-drams3a";

export default defineRailway((ctx) => {
  const db = postgres("postgres", { region: REGION });

  const api = service("api", {
    // The repo root, not api/: the build needs the whole pnpm workspace.
    // checkSuites: a commit only deploys once CI has passed on it.
    source: github("rvph10/readyyet", {
      branch: ctx.environment === "production" ? "main" : "staging",
      checkSuites: true,
    }),
    build: {
      builder: "RAILPACK",
      buildCommand:
        "pnpm --filter @readyyet/db run generate && pnpm --filter @readyyet/shared run build && pnpm --filter @readyyet/api run build",
      watchPatterns: ["/api/**", "/packages/**", "/package.json", "/pnpm-lock.yaml", "/pnpm-workspace.yaml", "/.nvmrc"],
    },
    // The seed only adds what's missing, so it's safe on every deploy.
    preDeploy: "pnpm --filter @readyyet/db run migrate:deploy && pnpm --filter @readyyet/db run seed",
    start: "node --enable-source-maps api/dist/main.js",
    healthcheck: "/health",
    replicas: { [REGION]: 1 },
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      BETTER_AUTH_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      // Secrets, or values that differ per environment: set in Railway,
      // never here, the repo is public.
      BETTER_AUTH_SECRET: preserve(),
      WEB_URL: preserve(),
      RESEND_API_KEY: preserve(),
      RESEND_WEBHOOK_SECRET: preserve(),
      EMAIL_FROM: preserve(),
      SUPPORT_EMAIL: preserve(),
      SENTRY_DSN: preserve(),
    },
  });

  return project("readyyet", { resources: [api, db] });
});
