// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Sales partners, managed by the platform admin", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let userCookie: string;
  let candidateId: string;
  const stamp = Date.now();
  const adminEmail = `delivered+platform-admin-${stamp}@resend.dev`;
  const candidateEmail = `delivered+sales-candidate-${stamp}@resend.dev`;

  function mark(cookie: string, email: string) {
    return request(app.getHttpServer()).post("/admin/sales-partners").set("Cookie", cookie).send({ email });
  }

  function remove(cookie: string, userId: string) {
    return request(app.getHttpServer()).delete(`/admin/sales-partners/${userId}`).set("Cookie", cookie);
  }

  function list(cookie: string) {
    return request(app.getHttpServer()).get("/admin/sales-partners").set("Cookie", cookie);
  }

  beforeAll(async () => {
    // Read on each request, the same as in a deployed environment.
    process.env.PLATFORM_ADMIN_EMAILS = `someone-else@readyyet.test, ${adminEmail.toUpperCase()}`;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
    userCookie = await signInViaOtp(app, prisma, `delivered+not-admin-${stamp}@resend.dev`);
    const candidate = await prisma.user.create({
      data: { id: `candidate-${stamp}`, email: candidateEmail, name: "Candidate" },
    });
    candidateId = candidate.id;
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await app.close();
  });

  it("is refused to anyone else", async () => {
    expect((await list(userCookie)).status).toBe(403);
    expect((await mark(userCookie, candidateEmail)).status).toBe(403);
    expect((await remove(userCookie, candidateId)).status).toBe(403);
  });

  it("tells the web app who is the platform admin and who is a sales partner", async () => {
    const admin = await request(app.getHttpServer()).get("/me").set("Cookie", adminCookie);
    expect(admin.body).toMatchObject({ platformAdmin: true, salesPartner: false });
    const user = await request(app.getHttpServer()).get("/me").set("Cookie", userCookie);
    expect(user.body).toMatchObject({ platformAdmin: false, salesPartner: false });
  });

  it("makes a user a sales partner by email, with a referral code", async () => {
    const response = await mark(adminCookie, candidateEmail.toUpperCase());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: candidateId, email: candidateEmail, name: "Candidate" });
    expect(response.body.referralCode).toMatch(/^[\w-]{8}$/);
    expect((await list(adminCookie)).body).toContainEqual(response.body);
  });

  it("refuses to mark a sales partner twice", async () => {
    const response = await mark(adminCookie, candidateEmail);

    expect(response.status).toBe(409);
  });

  it("refuses an email no account uses", async () => {
    expect((await mark(adminCookie, `nobody-${stamp}@readyyet.test`)).status).toBe(404);
    expect((await mark(adminCookie, "not-an-email")).status).toBe(400);
  });

  it("removes the status, and marking again brings the same code back", async () => {
    const { referralCode } = await prisma.user.findUniqueOrThrow({ where: { id: candidateId } });

    expect((await remove(adminCookie, candidateId)).status).toBe(204);
    expect((await list(adminCookie)).body.map((partner: { id: string }) => partner.id)).not.toContain(candidateId);
    expect((await remove(adminCookie, candidateId)).status).toBe(404);

    const again = await mark(adminCookie, candidateEmail);
    expect(again.body.referralCode).toBe(referralCode);
  });

  it("clears the status when the sales partner deletes their account", async () => {
    const email = `delivered+leaving-partner-${stamp}@resend.dev`;
    const cookie = await signInViaOtp(app, prisma, email);
    const { id } = (await mark(adminCookie, email)).body;
    expect((await request(app.getHttpServer()).get("/me").set("Cookie", cookie)).body.salesPartner).toBe(true);

    await request(app.getHttpServer()).delete("/me").set("Cookie", cookie).expect(204);

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user).toMatchObject({ salesPartnerSince: null, deletedAt: expect.any(Date) });
  });
});

describe("Commissions, seen by the sales partner and the platform admin", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let partnerCookie: string;
  let outsiderCookie: string;
  let partnerId: string;
  let ids: { owed: string; pending: string; paid: string; voided: string; owedToo: string };
  const stamp = Date.now();
  const adminEmail = `delivered+commission-admin-${stamp}@resend.dev`;
  const partnerEmail = `delivered+commission-partner-${stamp}@resend.dev`;
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const month = (date: Date) => date.toISOString().slice(0, 7);
  const paidFrom = daysAgo(30);

  const get = (path: string, cookie: string) => request(app.getHttpServer()).get(path).set("Cookie", cookie);
  const markPaid = (commissionIds: string[], cookie = adminCookie) =>
    request(app.getHttpServer()).post("/admin/commissions/mark-paid").set("Cookie", cookie).send({ commissionIds });

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
    partnerCookie = await signInViaOtp(app, prisma, partnerEmail);
    outsiderCookie = await signInViaOtp(app, prisma, `delivered+commission-outsider-${stamp}@resend.dev`);
    await request(app.getHttpServer())
      .post("/admin/sales-partners")
      .set("Cookie", adminCookie)
      .send({ email: partnerEmail });
    partnerId = (await prisma.user.findUniqueOrThrow({ where: { email: partnerEmail } })).id;

    const owner = await prisma.user.create({
      data: { id: `commission-shop-${stamp}`, email: `commission-shop-${stamp}@readyyet.test`, name: "Shop owner" },
    });
    const paying = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Paying Garage",
        referralCode: `pg${stamp}`,
        referredBySalesPartnerId: partnerId,
        paidFrom,
      },
    });
    await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Trial Garage",
        referralCode: `tg${stamp}`,
        referredBySalesPartnerId: partnerId,
      },
    });

    const commission = async (suffix: string, invoicePaidAt: Date, fields: object = {}) =>
      (
        await prisma.commission.create({
          data: {
            salesPartnerId: partnerId,
            businessId: paying.id,
            stripeInvoiceId: `in_${suffix}_${stamp}`,
            amount: 1715,
            invoicePaidAt,
            ...fields,
          },
        })
      ).id.toString();
    // Created oldest first, the lists show the newest first.
    ids = {
      paid: await commission("paid", daysAgo(40), { paidAt: daysAgo(5) }),
      owedToo: await commission("owed_too", daysAgo(25), { amount: 1000 }),
      owed: await commission("owed", daysAgo(20)),
      voided: await commission("voided", daysAgo(3), { voidedAt: daysAgo(1) }),
      pending: await commission("pending", daysAgo(2)),
    };
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await app.close();
  });

  it("shows the sales partner their Businesses, when their 6 months end, and their totals", async () => {
    const response = await get("/me/sales-partner", partnerCookie);

    expect(response.status).toBe(200);
    const commissionsEndAt = new Date(paidFrom);
    commissionsEndAt.setUTCMonth(commissionsEndAt.getUTCMonth() + 6);
    expect(response.body).toMatchObject({
      salesPartner: true,
      businesses: [
        { name: "Paying Garage", paidFrom: paidFrom.toISOString(), commissionsEndAt: commissionsEndAt.toISOString() },
        { name: "Trial Garage", paidFrom: null, commissionsEndAt: null },
      ],
      pendingAmount: 1715,
      owedAmount: 2715,
      paidAmount: 1715,
    });
    expect(response.body.referralCode).toMatch(/^[\w-]{8}$/);

    // Voided commissions count in no month.
    const expected = new Map<string, number>();
    for (const [date, amount] of [
      [daysAgo(40), 1715],
      [daysAgo(25), 1000],
      [daysAgo(20), 1715],
      [daysAgo(2), 1715],
    ] as const) {
      expected.set(month(date), (expected.get(month(date)) ?? 0) + amount);
    }
    const totals = new Map(
      response.body.monthlyTotals.map((total: { month: string; amount: number }) => [total.month, total.amount]),
    );
    expect(totals).toEqual(expected);
  });

  it("lists the sales partner's commissions newest first, a page at a time, with their state", async () => {
    const first = await get("/me/sales-partner/commissions?take=2", partnerCookie);

    expect(first.body.items.map((item: { id: string }) => item.id)).toEqual([ids.pending, ids.voided]);
    expect(first.body.items[0]).toEqual({
      id: ids.pending,
      business: { name: "Paying Garage" },
      invoicePaidAt: expect.any(String),
      amount: 1715,
      state: "PENDING",
      paidAt: null,
    });
    expect(first.body.items[1].state).toBe("VOIDED");

    const rest = await get(`/me/sales-partner/commissions?take=10&cursor=${first.body.nextCursor}`, partnerCookie);
    expect(rest.body.items.map((item: { state: string }) => item.state)).toEqual(["OWED", "OWED", "PAID"]);
    expect(rest.body.nextCursor).toBeNull();
  });

  it("is refused to someone who was never a sales partner", async () => {
    expect((await get("/me/sales-partner", outsiderCookie)).status).toBe(403);
    expect((await get("/me/sales-partner/commissions", outsiderCookie)).status).toBe(403);
  });

  it("shows the platform admin each sales partner's pending and owed amounts", async () => {
    const response = await get("/admin/sales-partners", adminCookie);

    expect(response.body).toContainEqual(
      expect.objectContaining({ id: partnerId, pendingAmount: 1715, owedAmount: 2715 }),
    );
  });

  it("lists commissions for the platform admin by state and sales partner", async () => {
    const response = await get(`/admin/commissions?state=OWED&salesPartnerId=${partnerId}`, adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([ids.owed, ids.owedToo]);
    expect(response.body.items[0]).toMatchObject({
      salesPartner: { id: partnerId, email: partnerEmail },
      business: { name: "Paying Garage" },
      stripeInvoiceId: `in_owed_${stamp}`,
      state: "OWED",
    });
    expect((await get("/admin/commissions?state=LOST", adminCookie)).status).toBe(400);
    expect((await get("/admin/commissions", partnerCookie)).status).toBe(403);
  });

  it("marks owed commissions paid, and refuses the whole request when one isn't owed", async () => {
    const refused = await markPaid([ids.owed, ids.pending]);
    expect(refused.status).toBe(409);
    expect((await prisma.commission.findUniqueOrThrow({ where: { id: BigInt(ids.owed) } })).paidAt).toBeNull();

    const paid = await markPaid([ids.owed, ids.owedToo]);
    expect(paid.status).toBe(200);
    expect(paid.body.map((item: { state: string }) => item.state)).toEqual(["PAID", "PAID"]);

    expect((await markPaid([ids.owed])).status).toBe(409);
    expect((await markPaid(["not-an-id"])).status).toBe(400);
    expect((await markPaid([ids.owed], partnerCookie)).status).toBe(403);
  });

  it("keeps the page for a removed sales partner, for what they're still owed", async () => {
    await request(app.getHttpServer()).delete(`/admin/sales-partners/${partnerId}`).set("Cookie", adminCookie);

    const response = await get("/me/sales-partner", partnerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ salesPartner: false, paidAmount: 1715 + 2715 });
  });
});
