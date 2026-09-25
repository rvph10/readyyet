// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Referral codes on POST /businesses", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sponsorCookie: string;
  let newcomerCookie: string;
  let sponsor: { id: string; referralCode: string };
  let salesPartnerId: string;
  const stamp = Date.now();

  function create(cookie: string, referralCode?: string) {
    return request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        name: "Referred Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550123",
          contactEmail: "main@referral.test",
          locale: "EN",
        },
        referralCode,
      });
  }

  function referrerOf(businessId: string) {
    return prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { referredByBusinessId: true, referredBySalesPartnerId: true },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sponsorCookie = await signInViaOtp(app, prisma, `delivered+referral-sponsor-${stamp}@resend.dev`);
    newcomerCookie = await signInViaOtp(app, prisma, `delivered+referral-newcomer-${stamp}@resend.dev`);
    sponsor = (await create(sponsorCookie)).body;

    const salesPartner = await prisma.user.create({
      data: {
        id: `sales-partner-${stamp}`,
        email: `delivered+referral-partner-${stamp}@resend.dev`,
        name: "Sales Partner",
        salesPartnerSince: new Date(),
        referralCode: `sp${stamp}`,
      },
    });
    salesPartnerId = salesPartner.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("gives each Business its own code, shown to its Owner", async () => {
    expect(sponsor.referralCode).toMatch(/^[\w-]{8}$/);
    const other = await create(newcomerCookie);
    expect(other.body.referralCode).not.toBe(sponsor.referralCode);

    const read = await request(app.getHttpServer()).get(`/businesses/${sponsor.id}`).set("Cookie", sponsorCookie);
    expect(read.body.referralCode).toBe(sponsor.referralCode);
  });

  it("records the sponsor Business whose code was used", async () => {
    const response = await create(newcomerCookie, sponsor.referralCode);

    expect(response.status).toBe(201);
    expect(await referrerOf(response.body.id)).toEqual({
      referredByBusinessId: sponsor.id,
      referredBySalesPartnerId: null,
    });
  });

  it("records the sales partner whose code was used", async () => {
    const response = await create(newcomerCookie, `sp${stamp}`);

    expect(await referrerOf(response.body.id)).toEqual({
      referredByBusinessId: null,
      referredBySalesPartnerId: salesPartnerId,
    });
  });

  it("creates the Business without a referrer for a code that matches nobody", async () => {
    const response = await create(newcomerCookie, "nobody00");

    expect(response.status).toBe(201);
    expect(await referrerOf(response.body.id)).toEqual({ referredByBusinessId: null, referredBySalesPartnerId: null });
  });

  it("ignores the caller's own sponsor code", async () => {
    const response = await create(sponsorCookie, sponsor.referralCode);

    expect(response.status).toBe(201);
    expect(await referrerOf(response.body.id)).toEqual({ referredByBusinessId: null, referredBySalesPartnerId: null });
  });

  it("ignores the code of a User who is no longer a sales partner", async () => {
    await prisma.user.update({ where: { id: salesPartnerId }, data: { salesPartnerSince: null } });

    const response = await create(newcomerCookie, `sp${stamp}`);

    expect(await referrerOf(response.body.id)).toEqual({ referredByBusinessId: null, referredBySalesPartnerId: null });
    await prisma.user.update({ where: { id: salesPartnerId }, data: { salesPartnerSince: new Date() } });
  });
});
