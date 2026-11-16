// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createBusiness } from "./support/billing";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Back-office overview, seen by the platform admin", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  const stamp = Date.now();
  const adminEmail = `delivered+overview-admin-${stamp}@resend.dev`;
  const ownerEmail = `delivered+overview-owner-${stamp}@resend.dev`;

  const overview = (cookie: string) => request(app.getHttpServer()).get("/admin/overview").set("Cookie", cookie);

  async function openShopWithTicket(cookie: string, name: string) {
    const { locationId } = await createBusiness(app, cookie, name);
    await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send({ title: "Brakes", customer: { fullName: "Driver", phone: "+32471000000" } })
      .expect(201);
  }

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await app.close();
  });

  it("is refused to anyone else", async () => {
    const cookie = await signInViaOtp(app, prisma, `delivered+overview-other-${stamp}@resend.dev`);
    expect((await overview(cookie)).status).toBe(403);
  });

  it("counts a new Owner's account, Location and Ticket this week, and lists them first", async () => {
    const before = (await overview(adminCookie).expect(200)).body;
    const ownerCookie = await signInViaOtp(app, prisma, ownerEmail);
    await openShopWithTicket(ownerCookie, "Garage Overview");
    const after = (await overview(adminCookie).expect(200)).body;

    for (const key of ["users", "locations", "tickets"] as const) {
      expect(after[key].total).toBe(before[key].total + 1);
      expect(after[key].weeks).toHaveLength(12);
      expect(after[key].weeks.at(-1).count).toBe(before[key].weeks.at(-1).count + 1);
    }
    expect(after.locations.trial).toBe(before.locations.trial + 1);
    expect(after.latestSignups[0]).toMatchObject({
      email: ownerEmail,
      businessName: "Garage Overview",
      locations: 1,
      tickets: 1,
    });
  });

  it("leaves out the platform admin's own account and shops", async () => {
    const before = (await overview(adminCookie).expect(200)).body;
    await openShopWithTicket(adminCookie, "Admin Test Garage");
    const after = (await overview(adminCookie).expect(200)).body;

    expect(after.locations.total).toBe(before.locations.total);
    expect(after.tickets.total).toBe(before.tickets.total);
    expect(after.latestSignups.map(({ email }: { email: string }) => email)).not.toContain(adminEmail);
  });
});
