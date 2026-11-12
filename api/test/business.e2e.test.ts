// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";
import { TERMS_VERSION } from "@readyyet/shared";

describe("POST /businesses", () => {
  let app: INestApplication;
  let sessionCookie: string;

  beforeAll(async () => {
    app = await createTestApp();

    const email = `delivered+business-test-${Date.now()}@resend.dev`;
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
      timeZone: "Europe/Brussels",
      contactPhone: "+12125550123",
      contactEmail: "downtown@joesgarage.test",
      locale: "EN",
    },
  };

  it("creates a business with its first location and an owner membership", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ termsVersion: TERMS_VERSION, ...validPayload });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Joe's Garage");
    expect(response.body.locations).toHaveLength(1);
    expect(response.body.locations[0].name).toBe("Downtown");
  });

  it("starts an Owner's first Business on a 14-day Pro trial, and a later one unpaid", async () => {
    const cookie = await signInViaOtp(app, app.get(PrismaService), `delivered+trial-${Date.now()}@resend.dev`);
    const create = () =>
      request(app.getHttpServer())
        .post("/businesses")
        .set("Cookie", cookie)
        .send({ termsVersion: TERMS_VERSION, ...validPayload });
    const response = await create();

    const subscription = await app
      .get(PrismaService)
      .subscription.findUniqueOrThrow({ where: { locationId: response.body.locations[0].id } });
    expect(subscription).toMatchObject({ status: "TRIAL", plan: "PRO", stripeSubscriptionId: null });
    const days = (subscription.trialEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(14, 1);

    const later = await create();
    expect(later.status).toBe(201);
    await expect(
      app.get(PrismaService).subscription.findUniqueOrThrow({ where: { locationId: later.body.locations[0].id } }),
    ).resolves.toMatchObject({ status: "ENDED", plan: null, trialEndsAt: null });
  });

  it("welcomes an Owner by email with their first Business only (ADR 0127)", async () => {
    const prisma = app.get(PrismaService);
    const email = `delivered+welcome-${Date.now()}@resend.dev`;
    const cookie = await signInViaOtp(app, prisma, email);
    const create = () =>
      request(app.getHttpServer())
        .post("/businesses")
        .set("Cookie", cookie)
        .send({ termsVersion: TERMS_VERSION, ...validPayload });
    await create();
    await create();

    const welcomes = () => prisma.emailLog.findMany({ where: { to: email, type: "welcome" } });
    await vi.waitFor(async () => expect(await welcomes()).toHaveLength(1), { timeout: 10_000, interval: 200 });
    const [welcome] = await welcomes();
    expect(welcome.subject).toBe("Welcome to ReadyYet, Downtown is ready");
    expect(welcome.text).toContain("14 days free");
  });

  it("keeps what an OTHER location does, in the owner's words", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({
        termsVersion: TERMS_VERSION,
        ...validPayload,
        location: { ...validPayload.location, businessTypeCode: "OTHER", businessTypeDetail: "Scooter repair" },
      });

    expect(response.status).toBe(201);
    expect(response.body.locations[0]).toMatchObject({
      businessTypeCode: "OTHER",
      businessTypeDetail: "Scooter repair",
    });
  });

  it("leaves the detail empty when none is given", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ termsVersion: TERMS_VERSION, ...validPayload });

    expect(response.body.locations[0].businessTypeDetail).toBeNull();
  });

  it("refuses a detail with any type but OTHER", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({
        termsVersion: TERMS_VERSION,
        ...validPayload,
        location: { ...validPayload.location, businessTypeDetail: "Scooter repair" },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown business type code", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({
        termsVersion: TERMS_VERSION,
        ...validPayload,
        location: { ...validPayload.location, businessTypeCode: "NOT_REAL" },
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a malformed request", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({
        termsVersion: TERMS_VERSION,
        ...validPayload,
        location: { ...validPayload.location, contactEmail: "not-an-email" },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a location without a time zone", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({
        termsVersion: TERMS_VERSION,
        ...validPayload,
        location: { ...validPayload.location, timeZone: undefined },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].property).toBe("location.timeZone");
  });

  it("rejects the request without a session", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .send({ termsVersion: TERMS_VERSION, ...validPayload });

    expect(response.status).toBe(401);
  });

  it("rejects a non-string name", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ termsVersion: TERMS_VERSION, ...validPayload, name: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request with no location", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ termsVersion: TERMS_VERSION, name: "No Location Co" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a location sent as an array", async () => {
    const response = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", sessionCookie)
      .send({ termsVersion: TERMS_VERSION, ...validPayload, location: [validPayload.location] });

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
    ownerCookie = await signInViaOtp(app, prisma, `delivered+add-location-owner-${stamp}@resend.dev`);
    const adminEmail = `delivered+add-location-admin-${stamp}@resend.dev`;
    adminCookie = await signInViaOtp(app, prisma, adminEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        termsVersion: TERMS_VERSION,
        name: "Multi-Location Co",
        location: {
          name: "First Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
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
        timeZone: "Europe/Brussels",
        contactPhone: "+12125550199",
        contactEmail: "second@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Second Shop");

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", ownerCookie);
    expect(me.body.memberships.filter((m: { role: string }) => m.role === "OWNER")).toHaveLength(2);
  });

  it("starts a later location without a trial, it has to be paid for", async () => {
    const response = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send({
        name: "Third Shop",
        businessTypeCode: "GARAGE",
        timeZone: "Europe/Brussels",
        contactPhone: "+12125550188",
        contactEmail: "third@multiloc.test",
        locale: "EN",
      });

    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { locationId: response.body.id } });
    expect(subscription).toMatchObject({ status: "ENDED", plan: null, trialEndsAt: null });
  });

  it("rejects a non-owner, even an admin at an existing location under that business", async () => {
    const response = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", adminCookie)
      .send({
        name: "Should not work",
        businessTypeCode: "GARAGE",
        timeZone: "Europe/Brussels",
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
        timeZone: "Europe/Brussels",
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
        timeZone: "Europe/Brussels",
        contactPhone: "+12125550102",
        contactEmail: "nowhere@multiloc.test",
        locale: "EN",
      });

    expect(response.status).toBe(404);
  });
});

describe("GET and PATCH /businesses/:businessId", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let businessId: string;
  let firstLocationId: string;

  const location = (name: string) => ({
    name,
    businessTypeCode: "GARAGE",
    timeZone: "Europe/Brussels",
    contactPhone: "+12125550123",
    contactEmail: "shop@readrename.test",
    locale: "EN",
  });

  function get(cookie: string, id = businessId) {
    return request(app.getHttpServer()).get(`/businesses/${id}`).set("Cookie", cookie);
  }

  function rename(cookie: string, body: object, id = businessId) {
    return request(app.getHttpServer()).patch(`/businesses/${id}`).set("Cookie", cookie).send(body);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+business-read-owner-${stamp}@resend.dev`);
    const adminEmail = `delivered+business-read-admin-${stamp}@resend.dev`;
    adminCookie = await signInViaOtp(app, prisma, adminEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({ termsVersion: TERMS_VERSION, name: "Read Rename Co", location: location("First") });
    businessId = created.body.id;
    firstLocationId = created.body.locations[0].id;
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    await prisma.membership.create({ data: { userId: admin.id, locationId: firstLocationId, role: "ADMIN" } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows the owner the business with its locations, deleted ones left out", async () => {
    const second = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send(location("Second"));
    const closed = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send(location("Closed"));
    await request(app.getHttpServer()).delete(`/locations/${closed.body.id}`).set("Cookie", ownerCookie);

    const response = await get(ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Read Rename Co");
    expect(response.body.locations.map((l: { id: string }) => l.id)).toEqual([firstLocationId, second.body.id]);
  });

  it("lets the owner rename it, and members see the new name", async () => {
    const response = await rename(ownerCookie, { name: "Renamed Co" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Renamed Co");
    const me = await request(app.getHttpServer()).get("/me").set("Cookie", adminCookie);
    expect(me.body.memberships[0].location.business.name).toBe("Renamed Co");
  });

  it("is the owner's alone, even for an admin of one of its locations", async () => {
    expect((await get(adminCookie)).status).toBe(403);
    expect((await rename(adminCookie, { name: "Hijacked" })).status).toBe(403);
  });

  it("rejects an empty or missing name", async () => {
    expect((await rename(ownerCookie, { name: "" })).status).toBe(400);
    expect((await rename(ownerCookie, {})).status).toBe(400);
  });

  it("returns 404 for an unknown business", async () => {
    expect((await get(ownerCookie, "00000000-0000-0000-0000-000000000000")).status).toBe(404);
    expect((await rename(ownerCookie, { name: "X" }, "not-a-uuid")).status).toBe(404);
  });
});
