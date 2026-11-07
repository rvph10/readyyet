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

const DAY_MS = 24 * 60 * 60 * 1000;

// ADR 0026: up to 5 photos per Ticket, shown to the Customer through
// short-lived bucket URLs, deletable by their author, an Owner or an Admin.
describe("Ticket photos", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let ownerCookie: string;
  let adminCookie: string;
  let employeeCookie: string;
  let otherEmployeeCookie: string;
  let outsiderCookie: string;
  let employeeId: string;
  let locationId: string;
  const stamp = Date.now();
  let ipCounter = 0;

  async function createTicket(title = "Pare-choc rayé") {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title, customer: { fullName: "Chloé Dubois" } });
    return response.body as { id: string; trackingCode: string };
  }

  // Uploads are limited to 5 a minute per client, each one is its own here.
  async function addPhoto(ticketId: string, cookie = employeeCookie, file?: Buffer) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticketId}/photos`)
      .set("Cookie", cookie)
      .set("X-Real-IP", `203.0.113.${++ipCounter % 250}`)
      .attach("file", file ?? (await imageFile("jpeg")), "photo.jpg");
  }

  function deletePhoto(ticketId: string, photoId: string, cookie: string) {
    return request(app.getHttpServer())
      .delete(`/locations/${locationId}/tickets/${ticketId}/photos/${photoId}`)
      .set("Cookie", cookie);
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
    expect(response.status).toBe(200);
  }

  function photoRows(ticketId: string) {
    return prisma.ticketPhoto.findMany({ where: { ticketId: BigInt(ticketId) } });
  }

  async function objectKeys() {
    const keys = [];
    for await (const object of storage.list()) {
      keys.push(object.key);
    }
    return keys;
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
    ownerCookie = await signInViaOtp(app, prisma, `delivered+photos-owner-${stamp}@resend.dev`);
    outsiderCookie = await signInViaOtp(app, prisma, `delivered+photos-outsider-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Photo Test",
        location: {
          name: "Carrosserie Martin",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@martin.test",
          locale: "FR",
        },
      });
    locationId = created.body.locations[0].id;
    adminCookie = await join(`delivered+photos-admin-${stamp}@resend.dev`, "ADMIN");
    const employeeEmail = `delivered+photos-employee-${stamp}@resend.dev`;
    employeeCookie = await join(employeeEmail, "EMPLOYEE");
    otherEmployeeCookie = await join(`delivered+photos-employee2-${stamp}@resend.dev`, "EMPLOYEE");
    employeeId = (await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } })).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("stores a photo as WebP within 1600px, without the phone's GPS position", async () => {
    const ticket = await createTicket();
    const phonePhoto = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#888" } })
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 51/1 0/1" } })
      .toBuffer();

    const response = await addPhoto(ticket.id, employeeCookie, phonePhoto);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      url: expect.any(String),
      uploadedBy: employeeId,
      createdAt: expect.any(String),
    });
    const stored = Buffer.from(await (await fetch(response.body.url)).arrayBuffer());
    const metadata = await sharp(stored).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 1600, height: 1200 });
    expect(metadata.exif).toBeUndefined();
  });

  it("gives a URL that expires after 15 minutes", async () => {
    const ticket = await createTicket();

    const { body } = await addPhoto(ticket.id);

    expect(new URL(body.url).searchParams.get("X-Amz-Expires")).toBe("900");
  });

  it("lists the photos on the Ticket's detail, oldest first", async () => {
    const ticket = await createTicket();
    const first = await addPhoto(ticket.id);
    const second = await addPhoto(ticket.id, ownerCookie);

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${ticket.id}`)
      .set("Cookie", ownerCookie);

    expect(detail.body.photos.map((photo: { id: string }) => photo.id)).toEqual([first.body.id, second.body.id]);
    expect((await fetch(detail.body.photos[0].url)).status).toBe(200);
  });

  it("shows the photos to the Customer on the tracking page, without who took them", async () => {
    const ticket = await createTicket();
    await addPhoto(ticket.id);

    const tracking = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

    expect(tracking.body.photos).toEqual([{ url: expect.any(String), createdAt: expect.any(String) }]);
    expect((await fetch(tracking.body.photos[0].url)).status).toBe(200);
  });

  it("refuses a sixth photo", async () => {
    const ticket = await createTicket();
    for (let i = 0; i < 5; i++) {
      expect((await addPhoto(ticket.id)).status).toBe(201);
    }

    const response = await addPhoto(ticket.id);

    expect(response.status).toBe(409);
    expect(await photoRows(ticket.id)).toHaveLength(5);
  });

  it("never lets two uploads at once make a sixth photo", async () => {
    const ticket = await createTicket();
    for (let i = 0; i < 4; i++) {
      await addPhoto(ticket.id);
    }
    const file = await imageFile("jpeg");

    const statuses = (
      await Promise.all([addPhoto(ticket.id, employeeCookie, file), addPhoto(ticket.id, adminCookie, file)])
    )
      .map((response) => response.status)
      .sort();

    expect(statuses).toEqual([201, 409]);
    expect(await photoRows(ticket.id)).toHaveLength(5);
  });

  it("deletes the stored file when saving the photo fails", async () => {
    const ticket = await createTicket();
    const before = await objectKeys();
    const transaction = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("connection lost"));

    const response = await addPhoto(ticket.id);

    transaction.mockRestore();
    expect(response.status).toBe(500);
    expect((await objectKeys()).filter((key) => !before.includes(key))).toEqual([]);
  });

  it("refuses a photo once the tracking link has expired, 30 days after the Ticket ended", async () => {
    const ticket = await createTicket();
    await setStatus(ticket.id, "CANCELLED");
    await prisma.ticketStatusEvent.updateMany({
      where: { ticketId: BigInt(ticket.id) },
      data: { createdAt: new Date(Date.now() - 31 * DAY_MS) },
    });

    const response = await addPhoto(ticket.id);

    expect(response.status).toBe(409);
  });

  it("still takes a photo on an ended Ticket whose link works", async () => {
    const ticket = await createTicket();
    await setStatus(ticket.id, "CANCELLED");

    expect((await addPhoto(ticket.id)).status).toBe(201);
  });

  it("refuses a file that isn't an image, and stores nothing", async () => {
    const ticket = await createTicket();

    const response = await addPhoto(ticket.id, employeeCookie, Buffer.from("%PDF-1.7"));

    expect(response.status).toBe(400);
    expect(await photoRows(ticket.id)).toHaveLength(0);
  });

  it("answers 404 for a Ticket of another Location", async () => {
    const other = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", outsiderCookie)
      .send({
        name: "Elsewhere",
        location: {
          name: "Garage Ailleurs",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123457",
          contactEmail: "ailleurs@test.test",
          locale: "FR",
        },
      });
    const otherTicket = await request(app.getHttpServer())
      .post(`/locations/${other.body.locations[0].id}/tickets`)
      .set("Cookie", outsiderCookie)
      .send({ title: "Not yours", customer: { fullName: "Someone" } });

    const response = await addPhoto(otherTicket.body.id);

    expect(response.status).toBe(404);
    expect(await photoRows(otherTicket.body.id)).toHaveLength(0);
  });

  it("refuses someone who isn't a member of the Location", async () => {
    const ticket = await createTicket();

    const response = await addPhoto(ticket.id, outsiderCookie);

    expect(response.status).toBe(403);
  });

  describe("deleting", () => {
    it("lets an Employee delete their own photo, and removes its file", async () => {
      const ticket = await createTicket();
      const { body: photo } = await addPhoto(ticket.id);

      const response = await deletePhoto(ticket.id, photo.id, employeeCookie);

      expect(response.status).toBe(204);
      expect(await photoRows(ticket.id)).toHaveLength(0);
      expect((await fetch(photo.url)).status).toBe(404);
    });

    it("refuses an Employee deleting someone else's photo", async () => {
      const ticket = await createTicket();
      const { body: photo } = await addPhoto(ticket.id);

      const response = await deletePhoto(ticket.id, photo.id, otherEmployeeCookie);

      expect(response.status).toBe(403);
      expect(await photoRows(ticket.id)).toHaveLength(1);
    });

    it.each([
      ["an Owner", () => ownerCookie],
      ["an Admin", () => adminCookie],
    ])("lets %s delete anyone's photo", async (_, cookie) => {
      const ticket = await createTicket();
      const { body: photo } = await addPhoto(ticket.id);

      const response = await deletePhoto(ticket.id, photo.id, cookie());

      expect(response.status).toBe(204);
    });

    it("answers 404 for a photo of another Ticket", async () => {
      const ticket = await createTicket();
      const otherTicket = await createTicket();
      const { body: photo } = await addPhoto(otherTicket.id);

      const response = await deletePhoto(ticket.id, photo.id, ownerCookie);

      expect(response.status).toBe(404);
      expect(await photoRows(otherTicket.id)).toHaveLength(1);
    });
  });
});
