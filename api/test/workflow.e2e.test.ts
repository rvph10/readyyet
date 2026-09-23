// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("GET /locations/:locationId/workflow", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+workflow-owner-${stamp}@resend.dev`);
    otherCookie = await signInViaOtp(app, prisma, `delivered+workflow-other-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Workflow Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@workflowtest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the location's default workflow starting at RECEIVED", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.steps[0].position).toBe(1);
    expect(response.body.steps[0].status.code).toBe("RECEIVED");
    expect(response.body.steps.some((step: { status: { code: string } }) => step.status.code === "DIAGNOSING")).toBe(
      true,
    );
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
  });
});
