// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { StorageService } from "../src/storage/storage.service";
import { createTestApp } from "./support/create-test-app";
import { imageFile } from "./support/images";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0026: a logo is uploaded, stored as a PNG in the bucket, and served
// publicly from the API with a long cache. ADR 0051: it's the Business's,
// set by its Owner and shown for every one of its Locations.
describe("Business logo", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let ownerCookie: string;
  let adminCookie: string;
  let employeeCookie: string;
  let businessId: string;
  let locationId: string;
  const stamp = Date.now();
  let ipCounter = 0;

  // Uploads are limited to 5 a minute per client, each test is its own client.
  function upload(cookie: string, file: Buffer | null, ip = `198.51.100.${++ipCounter}`) {
    const req = request(app.getHttpServer())
      .put(`/businesses/${businessId}/logo`)
      .set("Cookie", cookie)
      .set("X-Real-IP", ip);
    return file ? req.attach("file", file, "logo.jpg") : req;
  }

  async function objectKeys() {
    const keys = [];
    for await (const object of storage.list()) {
      keys.push(object.key);
    }
    return keys;
  }

  function imagePath(url: string) {
    return new URL(url).pathname;
  }

  async function logoKey() {
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    return business.logoKey;
  }

  async function join(email: string, role: "ADMIN" | "EMPLOYEE") {
    const cookie = await signInViaOtp(app, prisma, email);
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", cookie);
    return cookie;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+logo-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Logo Test",
        location: {
          name: "Cordonnerie Dupont",
          businessTypeCode: "SHOE_REPAIR",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@dupont.test",
          locale: "FR",
        },
      });
    businessId = created.body.id;
    locationId = created.body.locations[0].id;
    adminCookie = await join(`delivered+logo-admin-${stamp}@resend.dev`, "ADMIN");
    employeeCookie = await join(`delivered+logo-employee-${stamp}@resend.dev`, "EMPLOYEE");
  });

  afterAll(async () => {
    await app.close();
  });

  it("stores an uploaded logo as a PNG within 512px, served publicly with a year's cache", async () => {
    const response = await upload(ownerCookie, await imageFile("jpeg", 2000, 1000));

    expect(response.status).toBe(200);
    expect(response.body.logoUrl).toMatch(
      new RegExp(`^${process.env.BETTER_AUTH_URL}/images/logos/[0-9a-f-]{36}\\.png$`),
    );

    const image = await request(app.getHttpServer()).get(imagePath(response.body.logoUrl)).buffer(true);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
    expect(image.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(image.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(await sharp(image.body as Buffer).metadata()).toMatchObject({ format: "png", width: 512, height: 256 });
  });

  it("shows the logo on the tracking page", async () => {
    const { body: business } = await upload(ownerCookie, await imageFile("png"));
    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Bottines", customer: { fullName: "Chloé Dubois" } });

    const tracking = await request(app.getHttpServer()).get(`/tracking/${ticket.body.trackingCode}`);

    expect(tracking.body.location.logoUrl).toBe(business.logoUrl);
  });

  it("keeps a banner like a logo: Owner only, on the tracking page, gone from the bucket once removed", async () => {
    const put = (cookie: string, ip: string) =>
      request(app.getHttpServer())
        .put(`/businesses/${businessId}/banner`)
        .set("Cookie", cookie)
        .set("X-Real-IP", ip)
        .attach("file", banner, "banner.jpg");
    const banner = await imageFile("jpeg", 2000, 1000);

    expect((await put(adminCookie, "198.51.100.240")).status).toBe(403);
    const { body: business } = await put(ownerCookie, "198.51.100.241");
    expect(business.bannerUrl).toMatch(/\/images\/banners\/[0-9a-f-]{36}\.webp$/);
    expect((await request(app.getHttpServer()).get(imagePath(business.bannerUrl))).status).toBe(200);

    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Mocassins", customer: { fullName: "Chloé Dubois" } });
    const tracking = await request(app.getHttpServer()).get(`/tracking/${ticket.body.trackingCode}`);
    expect(tracking.body.location.bannerUrl).toBe(business.bannerUrl);

    const removed = await request(app.getHttpServer())
      .delete(`/businesses/${businessId}/banner`)
      .set("Cookie", ownerCookie);
    expect(removed.body.bannerUrl).toBeNull();
    expect((await request(app.getHttpServer()).get(imagePath(business.bannerUrl))).status).toBe(404);
  });

  it("gives a new logo a new URL and deletes the previous one from the bucket", async () => {
    const first = await upload(ownerCookie, await imageFile("png"));
    const second = await upload(ownerCookie, await imageFile("webp"));

    expect(second.body.logoUrl).not.toBe(first.body.logoUrl);
    const old = await request(app.getHttpServer()).get(imagePath(first.body.logoUrl));
    expect(old.status).toBe(404);
    // A missing image must not be cached for a year like a found one.
    expect(old.headers["cache-control"]).toBe("no-store");
  });

  it("shows the same logo for every Location of the Business", async () => {
    const second = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", ownerCookie)
      .send({
        name: "Cordonnerie Dupont Ixelles",
        businessTypeCode: "SHOE_REPAIR",
        timeZone: "Europe/Brussels",
        contactPhone: "+32470123457",
        contactEmail: "ixelles@dupont.test",
        locale: "FR",
      });
    const { body: business } = await upload(ownerCookie, await imageFile("png"));

    for (const id of [locationId, second.body.id]) {
      const location = await request(app.getHttpServer()).get(`/locations/${id}`).set("Cookie", ownerCookie);
      expect(location.body.logoUrl).toBe(business.logoUrl);
    }
  });

  it.each([
    ["an Admin", () => adminCookie],
    ["an Employee", () => employeeCookie],
  ])("refuses %s, and stores nothing", async (_, cookie) => {
    const before = await logoKey();

    const response = await upload(cookie(), await imageFile("png"));

    expect(response.status).toBe(403);
    expect(await logoKey()).toBe(before);
  });

  it("refuses a file that isn't an image, whatever it's called", async () => {
    const before = await logoKey();

    const response = await upload(ownerCookie, Buffer.from("<svg onload=alert(1)>"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await logoKey()).toBe(before);
  });

  it("refuses a request without a file", async () => {
    const response = await upload(ownerCookie, null);

    expect(response.status).toBe(400);
  });

  // Every other part would be held in memory too, up to 1 MB per text field.
  it.each([
    ["a text field", (req: request.Test) => req.field("name", "x".repeat(1024))],
    ["a second file", async (req: request.Test) => req.attach("other", await imageFile("png"), "other.png")],
  ])("refuses an upload that also carries %s, and stores nothing", async (_, addPart) => {
    const before = await logoKey();

    const response = await addPart(upload(ownerCookie, await imageFile("png")));

    expect(response.status).toBe(400);
    expect(await logoKey()).toBe(before);
  });

  it("deletes the stored file when saving the logo fails", async () => {
    const before = await objectKeys();
    const update = vi.spyOn(prisma.business, "update").mockRejectedValueOnce(new Error("connection lost"));

    const response = await upload(ownerCookie, await imageFile("png"));

    update.mockRestore();
    expect(response.status).toBe(500);
    expect((await objectKeys()).filter((key) => !before.includes(key))).toEqual([]);
  });

  it("refuses a file over 15 MB with a 413", async () => {
    const response = await upload(ownerCookie, Buffer.alloc(15 * 1024 * 1024 + 1));

    expect(response.status).toBe(413);
  });

  it("allows 5 uploads a minute per client", async () => {
    const file = await imageFile("png", 10, 10);
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await upload(ownerCookie, file, "198.51.100.250")).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("removes the logo, and its object with it", async () => {
    const { body: uploaded } = await upload(ownerCookie, await imageFile("png"));

    const response = await request(app.getHttpServer())
      .delete(`/businesses/${businessId}/logo`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.logoUrl).toBeNull();
    expect((await request(app.getHttpServer()).get(imagePath(uploaded.logoUrl))).status).toBe(404);
  });

  it("refuses an Admin removing the logo", async () => {
    const response = await request(app.getHttpServer())
      .delete(`/businesses/${businessId}/logo`)
      .set("Cookie", adminCookie);

    expect(response.status).toBe(403);
  });

  describe("GET /images", () => {
    it("never serves a Ticket photo, even with its exact key", async () => {
      const key = "tickets/0b7c7a9e-3f2a-4d7e-9a53-1c2d3e4f5a6b.webp";
      await storage.put(key, await imageFile("webp"), "image/webp");

      const response = await request(app.getHttpServer()).get(`/images/${key}`);

      expect(response.status).toBe(404);
      await storage.delete([key]);
    });

    it.each(["logos/..%2Ftickets%2Fx.webp", "logos/not-a-key.png", "logos/0b7c7a9e-3f2a-4d7e-9a53-1c2d3e4f5a6b.svg"])(
      "answers 404 for %s",
      async (path) => {
        const response = await request(app.getHttpServer()).get(`/images/${path}`);

        expect(response.status).toBe(404);
      },
    );
  });
});
