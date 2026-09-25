import { bucket, defineRailway, github, postgres, preserve, project, ref, service } from "railway/iac";

// Not applied on deploy: run `railway config plan` then `railway config apply`
// once per environment after changing it (ADR 0022).

// EU West (Amsterdam): customer data stays in the EU, like Sentry's (ADR 0019).
const REGION = "europe-west4-drams3a";

// Staging has a domain of its own so production's session cookie never
// reaches it (ADR 0043). The custom domains are attached in Railway, not here:
// Railway's IaC can't register them.
const PRODUCTION_ROOT = "readyyet.app";
const STAGING_ROOT = "readyyet-staging.app";

export default defineRailway((ctx) => {
  const production = ctx.environment === "production";
  const root = production ? PRODUCTION_ROOT : STAGING_ROOT;
  // checkSuites off: Railway would wait for every GitHub app's checks, and
  // some installed apps never finish theirs. CI passing is enforced by the
  // branch rulesets instead, nothing reaches either branch without it.
  const source = github("rvph10/readyyet", {
    branch: production ? "main" : "staging",
    checkSuites: false,
  });
  const db = postgres("postgres", { region: REGION });
  // Photos, logos and avatars (ADR 0026). Amsterdam too, and a bucket's
  // region can't be changed once it exists.
  const images = bucket("images", { region: "ams" });

  const api = service("api", {
    // The repo root, not api/: the build needs the whole pnpm workspace.
    source,
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
      // Set rather than left to Railway, so the web app can address the API
      // on the private network.
      PORT: "8080",
      DATABASE_URL: db.env.DATABASE_URL,
      S3_ENDPOINT: ref(images, "ENDPOINT"),
      S3_REGION: ref(images, "REGION"),
      S3_BUCKET: ref(images, "BUCKET"),
      S3_ACCESS_KEY_ID: ref(images, "ACCESS_KEY_ID"),
      S3_SECRET_ACCESS_KEY: ref(images, "SECRET_ACCESS_KEY"),
      BETTER_AUTH_URL: `https://api.${root}`,
      WEB_URL: `https://app.${root}`,
      // Secrets, or values that differ per environment: set in Railway,
      // never here, the repo is public.
      BETTER_AUTH_SECRET: preserve(),
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

  const web = service("web", {
    source,
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @readyyet/shared run build && pnpm --filter @readyyet/web run build",
    },
    start: "pnpm --filter @readyyet/web run start",
    healthcheck: "/health",
    replicas: { [REGION]: 1 },
    env: {
      NODE_ENV: "production",
      // The private network: no public hop, and no edge to overwrite the
      // X-Real-IP the web app forwards (ADR 0043).
      API_URL: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}",
    },
  });

  const site = service("site", {
    source,
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @readyyet/site run build",
    },
    start: "pnpm --filter @readyyet/site run start",
    healthcheck: "/health",
    replicas: { [REGION]: 1 },
    env: {
      NODE_ENV: "production",
    },
  });

  return project("readyyet", { resources: [api, web, site, db, images] });
});
