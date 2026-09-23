// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("GET /locations/:locationId", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `location-owner-${stamp}@readyyet.test`);
    otherCookie = await signInViaOtp(app, prisma, `location-other-${stamp}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Jane's Pressing",
        location: {
          name: "Main Street",
          businessTypeCode: "PRESSING",
          contactPhone: "+12125550199",
          contactEmail: "main@janespressing.test",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets the owner read their own location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(locationId);
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 for an unknown location", async () => {
    const response = await request(app.getHttpServer())
      .get("/locations/00000000-0000-0000-0000-000000000000")
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
  });

  it("returns 404, not a raw DB error, for a malformed id", async () => {
    const response = await request(app.getHttpServer()).get("/locations/not-a-uuid").set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
