// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";

describe("Catalogue", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists every business type with its labels and default workflow, without a session", async () => {
    const response = await request(app.getHttpServer()).get("/catalogue/business-types");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=300");
    expect(response.body).toHaveLength(11);
    const garage = response.body.find((type: { code: string }) => type.code === "GARAGE");
    expect(garage.translations).toContainEqual({ locale: "FR", label: expect.any(String) });
    const stepCodes = garage.defaultWorkflow.steps.map((step: { status: { code: string } }) => step.status.code);
    expect(stepCodes[0]).toBe("RECEIVED");
    expect(stepCodes).toEqual(expect.arrayContaining(["READY", "COMPLETED", "CANCELLED", "REJECTED"]));
    expect(garage).not.toHaveProperty("id");
  });

  it("lists every status and flags exactly the five system statuses", async () => {
    const response = await request(app.getHttpServer()).get("/catalogue/statuses");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(31);
    const systemCodes = response.body
      .filter((status: { isSystem: boolean }) => status.isSystem)
      .map((status: { code: string }) => status.code);
    expect(systemCodes.sort()).toEqual(["CANCELLED", "COMPLETED", "READY", "RECEIVED", "REJECTED"]);
    expect(response.body[0]).toEqual({
      code: "RECEIVED",
      translations: expect.arrayContaining([{ locale: "EN", label: "Received" }]),
      isSystem: true,
    });
  });
});
