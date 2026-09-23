// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("POST /businesses", () => {
  let app: INestApplication;
  let sessionCookie: string;

  beforeAll(async () => {
    app = await createTestApp();

    const email = `business-test-${Date.now()}@readyyet.test`;
    sessionCookie = await signInViaOtp(app, app.get(PrismaService), email);
  });

  afterAll(async () => {
    await app.close();
  });

  const validPayload = {
    name: "Joe's Garage",
    location: {
      name: "Downtown",
      businessTypeCode: "GARAGE",
      contactPhone: "+12125550123",
      contactEmail: "downtown@joesgarage.test",
      locale: "EN",
    },
  };

  it("creates a business with its first location and an owner membership", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Joe's Garage");
    expect(response.body.locations).toHaveLength(1);
    expect(response.body.locations[0].name).toBe("Downtown");
  });

  it("rejects an unknown business type code", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, location: { ...validPayload.location, businessTypeCode: "NOT_REAL" } });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a malformed request", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, location: { ...validPayload.location, contactEmail: "not-an-email" } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects the request without a session", async () => {
    const response = await request(app.getHttpServer()).post("/businesses").send(validPayload);

    expect(response.status).toBe(401);
  });

  it("rejects a non-string name", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, name: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request with no location", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ name: "No Location Co" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a location sent as an array", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ ...validPayload, location: [validPayload.location] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /businesses/:businessId/locations", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let businessId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `add-location-owner-${stamp}@readyyet.test`);
    const adminEmail = `add-location-admin-${stamp}@readyyet.test`;
    adminCookie = await signInViaOtp(app, prisma, adminEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Multi-Location Co",
        location: {
          name: "First Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "first@multiloc.test",
          locale: "EN",
        },
      });
    businessId = created.body.id;
    const firstLocationId = created.body.locations[0].id;

    const invitation = await request(app.getHttpServer())
      .post(`/locations/${firstLocationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: adminEmail, role: "ADMIN" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", adminCookie);
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets the owner add a second location, with its own owner membership", async () => {
    const response = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send({
        name: "Second Shop",
        businessTypeCode: "GARAGE",
        contactPhone: "+12125550199",
        contactEmail: "second@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Second Shop");

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", ownerCookie);
    expect(me.body.memberships.filter((m: { role: string }) => m.role === "OWNER")).toHaveLength(2);
  });

  it("rejects a non-owner, even an admin at an existing location under that business", async () => {
    const response = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", adminCookie)
      .send({
        name: "Should not work",
        businessTypeCode: "GARAGE",
        contactPhone: "+12125550100",
        contactEmail: "no@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an unknown business type code", async () => {
    const response = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send({
        name: "Third Shop",
        businessTypeCode: "NOT_REAL",
        contactPhone: "+12125550101",
        contactEmail: "third@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(404);
  });

  it("returns 404, not a raw DB error, for an unknown business id", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses/00000000-0000-0000-0000-000000000000/locations")
      .set("Cookie", ownerCookie)
      .send({
        name: "Nowhere",
        businessTypeCode: "GARAGE",
        contactPhone: "+12125550102",
        contactEmail: "nowhere@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(404);
  });
});
