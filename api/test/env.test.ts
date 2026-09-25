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
  STRIPE_SECRET_KEY: "sk_test_x",
  S3_ENDPOINT: "http://localhost:9090",
  S3_REGION: "us-east-1",
  S3_BUCKET: "readyyet",
  S3_ACCESS_KEY_ID: "local",
  S3_SECRET_ACCESS_KEY: "local",
};

describe("validateEnv", () => {
  it("accepts a complete environment and keeps other variables", () => {
    expect(validateEnv({ ...valid, PORT: "3000" })).toMatchObject({ ...valid, PORT: "3000" });
  });

  it("names every missing or malformed variable at once", () => {
    const check = () =>
      validateEnv({
        ...valid,
        DATABASE_URL: undefined,
        EMAIL_FROM: undefined,
        WEB_URL: "readyyet.app",
        S3_BUCKET: undefined,
      });

    expect(check).toThrow(/DATABASE_URL/);
    expect(check).toThrow(/S3_BUCKET/);
    expect(check).toThrow(/EMAIL_FROM/);
    expect(check).toThrow(/WEB_URL/);
  });

  it("requires the webhook secrets and error tracking in production only", () => {
    const production = {
      ...valid,
      NODE_ENV: "production",
      RESEND_WEBHOOK_SECRET: "whsec_x",
      STRIPE_WEBHOOK_SECRET: "whsec_y",
      SENTRY_DSN: "https://key@o1.ingest.sentry.io/1",
    };

    expect(() => validateEnv({ ...production, RESEND_WEBHOOK_SECRET: undefined })).toThrow(/RESEND_WEBHOOK_SECRET/);
    expect(() => validateEnv({ ...production, STRIPE_WEBHOOK_SECRET: undefined })).toThrow(/STRIPE_WEBHOOK_SECRET/);
    expect(() => validateEnv({ ...production, SENTRY_DSN: undefined })).toThrow(/SENTRY_DSN/);
    expect(validateEnv(production)).toBeTruthy();
  });

  it("rejects anything but a Stripe secret or restricted key", () => {
    expect(() => validateEnv({ ...valid, STRIPE_SECRET_KEY: "pk_test_x" })).toThrow(/STRIPE_SECRET_KEY/);
    expect(validateEnv({ ...valid, STRIPE_SECRET_KEY: "rk_test_x" })).toBeTruthy();
  });

  it("requires a real support address", () => {
    expect(() => validateEnv({ ...valid, SUPPORT_EMAIL: undefined })).toThrow(/SUPPORT_EMAIL/);
    expect(() => validateEnv({ ...valid, SUPPORT_EMAIL: "support" })).toThrow(/SUPPORT_EMAIL/);
  });

  it("rejects a secret too short to be safe", () => {
    expect(() => validateEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });
});
