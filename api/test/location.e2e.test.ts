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
  let employeeCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+location-owner-${stamp}@resend.dev`);
    otherCookie = await signInViaOtp(app, prisma, `delivered+location-other-${stamp}@resend.dev`);
    const employeeEmail = `delivered+location-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Jane's Pressing",
        location: {
          name: "Main Street",
          businessTypeCode: "PRESSING",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550199",
          contactEmail: "main@janespressing.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", employeeCookie);
  });

  afterAll(async () => {
    await app.close();
  });

  const patch = (body: object) =>
    request(app.getHttpServer()).patch(`/locations/${locationId}`).set("Cookie", ownerCookie).send(body);

  it("lets the owner read their own location", async () => {
    const response = await request(app.getHttpServer()).get(`/locations/${locationId}`).set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(locationId);
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer()).get(`/locations/${locationId}`).set("Cookie", otherCookie);

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

  it("lets the owner update the location's settings", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ name: "Main Street (renamed)", contactPhone: "+12125550188" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Main Street (renamed)");
    expect(response.body.contactPhone).toBe("+12125550188");
  });

  it("takes an https logo URL", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ logoUrl: "https://cdn.example.com/logo.png" });

    expect(response.status).toBe(200);
    expect(response.body.logoUrl).toBe("https://cdn.example.com/logo.png");
  });

  it.each(["javascript:alert(1)", "http://cdn.example.com/logo.png", "cdn.example.com/logo.png"])(
    "rejects the logo URL %s",
    async (logoUrl) => {
      const response = await request(app.getHttpServer())
        .patch(`/locations/${locationId}`)
        .set("Cookie", ownerCookie)
        .send({ logoUrl });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("logoUrl");
    },
  );

  it("is a no-op with an empty body", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({});

    expect(response.status).toBe(200);
  });

  describe("time zone", () => {
    it.each([
      ["Europe/Paris", "Europe/Paris"],
      ["europe/brussels", "Europe/Brussels"],
      ["US/Eastern", "America/New_York"],
    ])("stores %s as %s", async (timeZone, stored) => {
      const response = await patch({ timeZone });

      expect(response.status).toBe(200);
      expect(response.body.timeZone).toBe(stored);
    });

    // A fixed offset would show "UTC+1" and miss daylight saving changes.
    it.each(["UTC", "Etc/GMT+1", "+01:00", "Mars/Olympus", null])("rejects %s, it isn't a region", async (timeZone) => {
      const response = await patch({ timeZone });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("timeZone");
    });
  });

  describe("address", () => {
    const address = {
      streetAddress: "Rue Neuve 12",
      postalCode: "1000",
      addressLocality: "Bruxelles",
      addressCountry: "BE",
    };

    it("is set whole, and removed with null", async () => {
      const set = await patch({ address });
      expect(set.status).toBe(200);
      expect(set.body.address).toEqual(address);

      const removed = await patch({ address: null });
      expect(removed.status).toBe(200);
      expect(removed.body.address).toBeNull();
    });

    it("rejects one missing a field", async () => {
      const response = await patch({ address: { ...address, postalCode: undefined } });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("address.postalCode");
    });

    it("trims the fields, refusing one made of spaces", async () => {
      const padded = await patch({ address: { ...address, addressLocality: "  Bruxelles " } });
      expect(padded.status).toBe(200);
      expect(padded.body.address).toEqual(address);

      const blank = await patch({ address: { ...address, streetAddress: "   " } });
      expect(blank.status).toBe(400);
      expect(blank.body.error.details[0].property).toBe("address.streetAddress");
    });

    it.each(["be", "BEL", "XX"])(
      "rejects the country %s, it isn't an ISO 3166-1 alpha-2 code",
      async (addressCountry) => {
        const response = await patch({ address: { ...address, addressCountry } });

        expect(response.status).toBe(400);
        expect(response.body.error.details[0].property).toBe("address.addressCountry");
      },
    );
  });

  describe("opening hours", () => {
    it("stores the week in order, two ranges on a day closed at lunch", async () => {
      const response = await patch({
        openingHours: [
          { dayOfWeek: "Saturday", opens: "10:00", closes: "16:00" },
          { dayOfWeek: "Monday", opens: "13:30", closes: "18:00" },
          { dayOfWeek: "Monday", opens: "09:00", closes: "12:30" },
        ],
      });

      expect(response.status).toBe(200);
      expect(response.body.openingHours).toEqual([
        { dayOfWeek: "Monday", opens: "09:00", closes: "12:30" },
        { dayOfWeek: "Monday", opens: "13:30", closes: "18:00" },
        { dayOfWeek: "Saturday", opens: "10:00", closes: "16:00" },
      ]);
    });

    it("is removed with an empty list", async () => {
      await patch({ openingHours: [{ dayOfWeek: "Monday", opens: "09:00", closes: "18:00" }] });
      const response = await patch({ openingHours: [] });

      expect(response.status).toBe(200);
      expect(response.body.openingHours).toEqual([]);
    });

    it.each([
      [
        "three ranges on a day",
        [
          { dayOfWeek: "Monday", opens: "08:00", closes: "10:00" },
          { dayOfWeek: "Monday", opens: "11:00", closes: "13:00" },
          { dayOfWeek: "Monday", opens: "14:00", closes: "18:00" },
        ],
      ],
      [
        "overlapping ranges",
        [
          { dayOfWeek: "Monday", opens: "09:00", closes: "13:00" },
          { dayOfWeek: "Monday", opens: "12:00", closes: "18:00" },
        ],
      ],
      ["a range closing before it opens", [{ dayOfWeek: "Monday", opens: "18:00", closes: "09:00" }]],
      ["null, an empty list removes them", null],
    ])("rejects %s", async (_, openingHours) => {
      const response = await patch({ openingHours });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("openingHours");
    });

    it.each([
      ["a time without a colon", { dayOfWeek: "Monday", opens: "0900", closes: "18:00" }, "openingHours.0.opens"],
      ["24:00", { dayOfWeek: "Monday", opens: "09:00", closes: "24:00" }, "openingHours.0.closes"],
      ["an unknown day", { dayOfWeek: "Mon", opens: "09:00", closes: "18:00" }, "openingHours.0.dayOfWeek"],
    ])("rejects %s", async (_, range, property) => {
      const response = await patch({ openingHours: [range] });

      expect(response.status).toBe(400);
      expect(response.body.error.details.map((detail: { property: string }) => detail.property)).toContain(property);
    });
  });

  it("rejects an EMPLOYEE updating location settings", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", employeeCookie)
      .send({ name: "Should not work" });

    expect(response.status).toBe(403);
  });
});
