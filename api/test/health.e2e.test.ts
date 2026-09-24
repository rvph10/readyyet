// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";

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

    expect(response.headers["x-release"]).toBe(process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown");
  });
});
