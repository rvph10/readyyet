// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";

const WEB_URL = process.env.WEB_URL as string;
const OTHER_ORIGIN = "https://evil.example";

describe("HTTP middleware", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(["/health", "/api/auth/get-session", "/tracking/unknown-code"])(
    "sets security headers on %s",
    async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
      expect(response.headers["strict-transport-security"]).toBeDefined();
      expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
    },
  );

  // Better Auth's own trustedOrigins check isn't covered here: it disables
  // itself whenever NODE_ENV is "test" (advanced.disableOriginCheck
  // defaults to isTest()), so it can only be exercised against a real
  // running server.
  it("allows a PATCH preflight from the web app with credentials", async () => {
    const response = await request(app.getHttpServer())
      .options("/locations/00000000-0000-0000-0000-000000000000")
      .set("Origin", WEB_URL)
      .set("Access-Control-Request-Method", "PATCH");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_URL);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
  });

  it("applies to Better Auth's own routes too", async () => {
    const response = await request(app.getHttpServer())
      .options("/api/auth/sign-in/email-otp")
      .set("Origin", WEB_URL)
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_URL);
  });

  it("does not allow any other origin", async () => {
    const response = await request(app.getHttpServer())
      .options("/locations/00000000-0000-0000-0000-000000000000")
      .set("Origin", OTHER_ORIGIN)
      .set("Access-Control-Request-Method", "PATCH");

    expect(response.headers["access-control-allow-origin"]).not.toBe(OTHER_ORIGIN);
  });
});
