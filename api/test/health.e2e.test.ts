// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";

// Before any import: HealthController reads it when its module loads.
const RELEASE = vi.hoisted(() => (process.env.RAILWAY_GIT_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567"));

describe("GET /health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports the database as up", async () => {
    const server = app.getHttpServer();
    const response = await request(server).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.info.database.status).toBe("up");
  });

  it("names the commit it runs", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.headers["x-release"]).toBe(RELEASE);
  });
});
