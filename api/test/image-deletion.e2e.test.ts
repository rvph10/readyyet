// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { ImageSweepService } from "../src/storage/image-sweep.service";
import { StorageService } from "../src/storage/storage.service";
import { createTestApp } from "./support/create-test-app";
import { imageFile } from "./support/images";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;

// ADR 0026: pictures are deleted with what they belong to, rows first and
// objects after, and two sweeps delete what no request does.
describe("Deleting pictures", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let sweep: ImageSweepService;
  let ownerCookie: string;
  const stamp = Date.now();
  let ipCounter = 0;

  async function createLocation(name: string) {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name,
        location: {
          name,
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@deletion.test",
          locale: "FR",
        },
      });
    return created.body.locations[0].id as string;
  }

  async function createTicket(locationId: string, customer: object = { fullName: "Chloé Dubois" }) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Portière", customer });
    return response.body as { id: string; customer: { id: string } };
  }

  // Uploads are limited to 5 a minute per client, each one is its own here.
  async function addPhoto(locationId: string, ticketId: string) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticketId}/photos`)
      .set("Cookie", ownerCookie)
      .set("X-Real-IP", `198.18.0.${++ipCounter}`)
      .attach("file", await imageFile("jpeg"), "photo.jpg");
    expect(response.status).toBe(201);
    return (await prisma.ticketPhoto.findUniqueOrThrow({ where: { id: BigInt(response.body.id) } })).objectKey;
  }

  async function setLogo(locationId: string) {
    const response = await request(app.getHttpServer())
      .put(`/locations/${locationId}/logo`)
      .set("Cookie", ownerCookie)
      .set("X-Real-IP", `198.18.0.${++ipCounter}`)
      .attach("file", await imageFile("png"), "logo.png");
    expect(response.status).toBe(200);
    return (await prisma.location.findUniqueOrThrow({ where: { id: locationId } })).logoKey as string;
  }

  async function exists(key: string) {
    return (await storage.stream(key)) !== null;
  }

  async function endTicket(ticketId: string, daysAgo: number) {
    await prisma.ticket.update({
      where: { id: BigInt(ticketId) },
      data: { currentStatus: { connect: { code: "CANCELLED" } } },
    });
    await prisma.ticketStatusEvent.updateMany({
      where: { ticketId: BigInt(ticketId) },
      data: { createdAt: new Date(Date.now() - daysAgo * DAY_MS) },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    sweep = app.get(ImageSweepService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+image-deletion-${stamp}@resend.dev`);
  });

  afterAll(async () => {
    await app.close();
  });

  it("deletes a Location's logo and its Tickets' photos with it", async () => {
    const locationId = await createLocation("Garage Fermé");
    const logo = await setLogo(locationId);
    const ticket = await createTicket(locationId);
    const photo = await addPhoto(locationId, ticket.id);

    const response = await request(app.getHttpServer()).delete(`/locations/${locationId}`).set("Cookie", ownerCookie);

    expect(response.status).toBe(204);
    expect(await prisma.ticketPhoto.count({ where: { ticketId: BigInt(ticket.id) } })).toBe(0);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: locationId } })).logoKey).toBeNull();
    expect(await exists(logo)).toBe(false);
    expect(await exists(photo)).toBe(false);
  });

  it("deletes the photos of an erased Customer's Tickets, and only theirs", async () => {
    const locationId = await createLocation("Garage Discret");
    const erased = await createTicket(locationId, { fullName: "Erased Customer" });
    const kept = await createTicket(locationId, { fullName: "Kept Customer" });
    const erasedPhoto = await addPhoto(locationId, erased.id);
    const keptPhoto = await addPhoto(locationId, kept.id);

    const response = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${erased.customer.id}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(204);
    expect(await exists(erasedPhoto)).toBe(false);
    expect(await prisma.ticketPhoto.count({ where: { ticketId: BigInt(erased.id) } })).toBe(0);
    expect(await exists(keptPhoto)).toBe(true);
  });

  describe("expired photos sweep", () => {
    let locationId: string;

    beforeAll(async () => {
      locationId = await createLocation("Garage Ancien");
    });

    it("runs every hour", () => {
      const job = app.get(SchedulerRegistry).getCronJob("ticket-photo-expiry");

      expect(job.cronTime.source).toBe("0 0 * * * *");
    });

    it("deletes the photos of a Ticket whose tracking link expired, keeps the others", async () => {
      const expired = await createTicket(locationId);
      const recent = await createTicket(locationId);
      const open = await createTicket(locationId);
      const expiredPhoto = await addPhoto(locationId, expired.id);
      const recentPhoto = await addPhoto(locationId, recent.id);
      const openPhoto = await addPhoto(locationId, open.id);
      await endTicket(expired.id, 31);
      await endTicket(recent.id, 29);
      // Open for months, still at its first Status.
      await prisma.ticketStatusEvent.updateMany({
        where: { ticketId: BigInt(open.id) },
        data: { createdAt: new Date(Date.now() - 90 * DAY_MS) },
      });

      await sweep.deleteExpiredPhotos();

      expect(await exists(expiredPhoto)).toBe(false);
      expect(await prisma.ticketPhoto.count({ where: { ticketId: BigInt(expired.id) } })).toBe(0);
      expect(await exists(recentPhoto)).toBe(true);
      expect(await exists(openPhoto)).toBe(true);
    });
  });

  describe("orphan sweep", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("runs every day", () => {
      const job = app.get(SchedulerRegistry).getCronJob("orphan-images");

      expect(job.cronTime.source).toBe("0 0 3 * * *");
    });

    it("deletes a day-old object no row points to, and keeps every picture in use", async () => {
      const locationId = await createLocation("Garage Rangé");
      const logo = await setLogo(locationId);
      const ticket = await createTicket(locationId);
      const photo = await addPhoto(locationId, ticket.id);
      const avatarResponse = await request(app.getHttpServer())
        .put("/me/avatar")
        .set("Cookie", ownerCookie)
        .set("X-Real-IP", `198.18.0.${++ipCounter}`)
        .attach("file", await imageFile("png"), "me.png");
      const avatar = new URL(avatarResponse.body.avatarUrl).pathname.replace("/images/", "");
      const orphan = "tickets/5f0c8a2e-1b3d-4c5e-8f9a-0b1c2d3e4f5a.webp";
      await storage.put(orphan, await imageFile("webp"), "image/webp");

      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * DAY_MS });
      await sweep.deleteOrphans();

      expect(await exists(orphan)).toBe(false);
      for (const key of [logo, photo, avatar]) {
        expect(await exists(key)).toBe(true);
      }
    });

    it("keeps an object less than a day old, it may be an upload in progress", async () => {
      const young = "logos/6a1d9b3f-2c4e-4d6f-9a0b-1c2d3e4f5a6b.png";
      await storage.put(young, await imageFile("png"), "image/png");

      await sweep.deleteOrphans();

      expect(await exists(young)).toBe(true);
      await storage.delete([young]);
    });
  });
});
