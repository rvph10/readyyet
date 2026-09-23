// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const location = {
  name: "Locale Shop",
  businessTypeCode: "PRESSING",
  contactPhone: "+12125550122",
  contactEmail: "shop@localetest.test",
};

describe("Locale", () => {
  let app: INestApplication;
  let ownerCookie: string;
  let locationId: string;

  function createTicket(customer: object) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Suit", customer: { fullName: "Dana Locale", ...customer } });
  }

  async function trackingLocale(trackingCode: string) {
    const response = await request(app.getHttpServer()).get(`/tracking/${trackingCode}`);
    return response.body.locale as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, `locale-owner-${Date.now()}@readyyet.test`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({ name: "Locale Test Pressing", location: { ...location, locale: "FR" } });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires a valid locale when creating a location", async () => {
    for (const payload of [location, { ...location, locale: "DE_XX" }]) {
      const response = await request(app.getHttpServer())
        .post("/businesses")
        .set("Cookie", ownerCookie)
        .send({ name: "No Locale", location: payload });
      expect(response.status).toBe(400);
    }
  });

  it("stores the location's locale and lets an admin change it", async () => {
    const before = await request(app.getHttpServer()).get(`/locations/${locationId}`).set("Cookie", ownerCookie);
    expect(before.body.locale).toBe("FR");

    const updated = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ locale: "EN" });
    expect(updated.body.locale).toBe("EN");

    await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ locale: "FR" });
  });

  it("uses the location's locale on the tracking page when the customer has none", async () => {
    const ticket = await createTicket({});

    expect(ticket.body.customer.locale).toBeNull();
    expect(await trackingLocale(ticket.body.trackingCode)).toBe("FR");
  });

  it("uses the customer's own locale when staff set one at drop-off", async () => {
    const ticket = await createTicket({ locale: "EN" });

    expect(ticket.body.customer.locale).toBe("EN");
    expect(await trackingLocale(ticket.body.trackingCode)).toBe("EN");
  });

  it("lets staff change a customer's locale, or clear it back to the location's", async () => {
    const ticket = await createTicket({ locale: "EN" });
    const customerPath = `/locations/${locationId}/customers/${ticket.body.customer.id}`;

    const cleared = await request(app.getHttpServer())
      .patch(customerPath)
      .set("Cookie", ownerCookie)
      .send({ locale: null });
    expect(cleared.body.locale).toBeNull();
    expect(await trackingLocale(ticket.body.trackingCode)).toBe("FR");

    const invalid = await request(app.getHttpServer())
      .patch(customerPath)
      .set("Cookie", ownerCookie)
      .send({ locale: "XX" });
    expect(invalid.status).toBe(400);
  });
});
