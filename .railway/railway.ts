import { bucket, defineRailway, github, postgres, preserve, project, ref, service } from "railway/iac";

// Not applied on deploy: run `railway config plan` then `railway config apply`
// once per environment after changing it (ADR 0022).

// EU West (Amsterdam): customer data stays in the EU, like Sentry's (ADR 0019).
const REGION = "europe-west4-drams3a";

// Attached to the production service in Railway, not here: Railway's IaC
// can't register a custom domain. Staging keeps the one Railway generates.
const PRODUCTION_DOMAIN = "api.readyyet.app";

export default defineRailway((ctx) => {
  const production = ctx.environment === "production";
  const db = postgres("postgres", { region: REGION });
  // Photos, logos and avatars (ADR 0026). Amsterdam too, and a bucket's
  // region can't be changed once it exists.
  const images = bucket("images", { region: "ams" });

  const api = service("api", {
    // The repo root, not api/: the build needs the whole pnpm workspace.
    // checkSuites off: Railway would wait for every GitHub app's checks, and
    // some installed apps never finish theirs. CI passing is enforced by the
    // branch rulesets instead, nothing reaches either branch without it.
    source: github("rvph10/readyyet", {
      branch: production ? "main" : "staging",
      checkSuites: false,
    }),
    build: {
      builder: "RAILPACK",
      buildCommand:
        "pnpm --filter @readyyet/db run generate && pnpm --filter @readyyet/shared run build && pnpm --filter @readyyet/api run build",
      // No watchPatterns, on purpose: every commit deploys, a docs-only one
      // included, since promoting to main checks staging runs exactly the
      // commit being promoted.
    },
    // The seed only adds what's missing, so it's safe on every deploy.
    preDeploy: "pnpm --filter @readyyet/db run migrate:deploy && pnpm --filter @readyyet/db run seed",
    start: "node --enable-source-maps api/dist/main.js",
    healthcheck: "/health",
    replicas: { [REGION]: 1 },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      S3_ENDPOINT: ref(images, "ENDPOINT"),
      S3_REGION: ref(images, "REGION"),
      S3_BUCKET: ref(images, "BUCKET"),
      S3_ACCESS_KEY_ID: ref(images, "ACCESS_KEY_ID"),
      S3_SECRET_ACCESS_KEY: ref(images, "SECRET_ACCESS_KEY"),
      BETTER_AUTH_URL: production ? `https://${PRODUCTION_DOMAIN}` : "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      // Secrets, or values that differ per environment: set in Railway,
      // never here, the repo is public.
      BETTER_AUTH_SECRET: preserve(),
      WEB_URL: preserve(),
      RESEND_API_KEY: preserve(),
      RESEND_WEBHOOK_SECRET: preserve(),
      EMAIL_FROM: preserve(),
      SUPPORT_EMAIL: preserve(),
      SENTRY_DSN: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
      PLATFORM_ADMIN_EMAILS: preserve(),
    },
  });

  return project("readyyet", { resources: [api, db, images] });
});
