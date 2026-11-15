import { defineConfig, devices } from "@playwright/test";

// e2e/smoke.spec.ts reads the emails from the same port.
const EMAIL_SINK_PORT = "3025";
const EMAIL_SINK_URL = `http://localhost:${EMAIL_SINK_PORT}`;

// ADR 0159: one browser walk through the main path, against the built API
// and web app. Builds happen before (see the e2e job in ci.yml), the servers
// are started here.
export default defineConfig({
  testDir: "e2e",
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    // The app's messages come in English and French, the test reads the English ones.
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/email-sink.mjs",
      url: EMAIL_SINK_URL,
      env: { EMAIL_SINK_PORT },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node --enable-source-maps api/dist/main.js",
      cwd: "..",
      url: "http://localhost:3000/health",
      // Never a dev API already running here: it would send the test's
      // emails through the real Resend instead of the sink.
      reuseExistingServer: false,
      // The same values as the api job in ci.yml, with Resend pointed at the sink.
      env: {
        PORT: "3000",
        NODE_ENV: "test",
        // Its own database locally: a dev API on the shared one would pick up
        // this test's queued emails and send them through the real Resend.
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://readyyet:readyyet@localhost:5432/readyyet_e2e",
        S3_ENDPOINT: "http://localhost:9090",
        S3_REGION: "us-east-1",
        S3_BUCKET: "readyyet",
        S3_ACCESS_KEY_ID: "e2e",
        S3_SECRET_ACCESS_KEY: "e2e",
        BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
        BETTER_AUTH_URL: "http://localhost:3000",
        WEB_URL: "http://localhost:3001",
        EMAIL_FROM: "ReadyYet <hello@readyyet.app>",
        SUPPORT_EMAIL: "support@readyyet.app",
        RESEND_BASE_URL: EMAIL_SINK_URL,
        RESEND_API_KEY: "re_e2e_never_used",
        STRIPE_SECRET_KEY: "sk_test_e2e_never_used",
      },
    },
    {
      command: "pnpm exec next start --port 3001",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      // Read at runtime by the server; the NEXT_PUBLIC_ ones were baked in at build.
      env: {
        API_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:3000",
        S3_ENDPOINT: "http://localhost:9090",
        SITE_URL: "http://localhost:3002",
        SUPPORT_EMAIL: "support@readyyet.app",
      },
    },
  ],
});
