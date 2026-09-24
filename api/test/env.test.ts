import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config/env";

const valid = {
  DATABASE_URL: "postgresql://readyyet:readyyet@localhost:5432/readyyet",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:3001",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "ReadyYet <hello@readyyet.app>",
  SUPPORT_EMAIL: "support@readyyet.app",
};

describe("validateEnv", () => {
  it("accepts a complete environment and keeps other variables", () => {
    expect(validateEnv({ ...valid, PORT: "3000" })).toMatchObject({ ...valid, PORT: "3000" });
  });

  it("names every missing or malformed variable at once", () => {
    const check = () =>
      validateEnv({ ...valid, DATABASE_URL: undefined, EMAIL_FROM: undefined, WEB_URL: "readyyet.app" });

    expect(check).toThrow(/DATABASE_URL/);
    expect(check).toThrow(/EMAIL_FROM/);
    expect(check).toThrow(/WEB_URL/);
  });

  it("requires the webhook secret and error tracking in production only", () => {
    const production = { ...valid, NODE_ENV: "production" };
    const sentryDsn = "https://key@o1.ingest.sentry.io/1";

    expect(() => validateEnv({ ...production, SENTRY_DSN: sentryDsn })).toThrow(/RESEND_WEBHOOK_SECRET/);
    expect(() => validateEnv({ ...production, RESEND_WEBHOOK_SECRET: "whsec_x" })).toThrow(/SENTRY_DSN/);
    expect(validateEnv({ ...production, RESEND_WEBHOOK_SECRET: "whsec_x", SENTRY_DSN: sentryDsn })).toBeTruthy();
  });

  it("requires a real support address", () => {
    expect(() => validateEnv({ ...valid, SUPPORT_EMAIL: undefined })).toThrow(/SUPPORT_EMAIL/);
    expect(() => validateEnv({ ...valid, SUPPORT_EMAIL: "support" })).toThrow(/SUPPORT_EMAIL/);
  });

  it("rejects a secret too short to be safe", () => {
    expect(() => validateEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });
});
