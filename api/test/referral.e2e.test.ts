// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { PrismaService } from "../src/database/prisma.service";
import { stripe } from "./support/billing";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// Hoisted by vitest above the imports, so the app gets the fake client.
vi.mock("../src/billing/stripe-client", async () => {
  const { stripe } = await import("./support/billing");
  return { getStripeClient: () => stripe };
});

const location = {
  name: "Main Shop",
  businessTypeCode: "GARAGE",
  timeZone: "Europe/Brussels",
  contactPhone: "+12125550123",
  contactEmail: "main@referral.test",
  locale: "EN",
};

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
      .send({ name: "Referred Garage", location, referralCode });
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

describe("Discounts at checkout", () => {
  const secret = "whsec_test_only_used_in_this_suite";
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let referred: { businessId: string; locationId: string };
  let unreferred: { businessId: string; locationId: string };
  let previousSecret: string | undefined;
  const stamp = Date.now();

  async function createBusiness(referralCode?: string) {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({ name: "Discount Garage", location, referralCode });
    return { businessId: created.body.id as string, locationId: created.body.locations[0].id as string };
  }

  const checkout = (locationId: string, body: object) =>
    request(app.getHttpServer()).post(`/locations/${locationId}/billing/checkout`).set("Cookie", cookie).send(body);

  const billing = (locationId: string) =>
    request(app.getHttpServer()).get(`/locations/${locationId}/billing`).set("Cookie", cookie);

  const lastSession = () => stripe.checkout.sessions.create.mock.lastCall![0] as Stripe.Checkout.SessionCreateParams;

  beforeAll(async () => {
    previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cookie = await signInViaOtp(app, prisma, `delivered+referral-checkout-${stamp}@resend.dev`);

    const sponsorOwner = await prisma.user.create({
      data: { id: `sponsor-${stamp}`, email: `sponsor-${stamp}@referral.test`, name: "Sponsor" },
    });
    await prisma.business.create({
      data: { ownerId: sponsorOwner.id, name: "Sponsor Garage", referralCode: `sc${stamp}` },
    });
    referred = await createBusiness(`sc${stamp}`);
    unreferred = await createBusiness();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stripe.customers.create.mockImplementation((params: { metadata: { businessId: string } }) => ({
      id: `cus_${params.metadata.businessId}`,
    }));
    stripe.prices.list.mockResolvedValue({ data: [{ id: "price_1" }] });
    stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test" });
  });

  afterAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  it("tells the billing page whether the next checkout takes the referral discount", async () => {
    expect((await billing(referred.locationId)).body.referralDiscount).toBe(true);
    expect((await billing(unreferred.locationId)).body.referralDiscount).toBe(false);
  });

  it("applies the referral coupon of the chosen plan, and flags it for the webhook", async () => {
    await checkout(referred.locationId, { plan: "PRO", interval: "MONTH" });
    expect(lastSession()).toMatchObject({
      discounts: [{ coupon: "referral-pro" }],
      metadata: { locationId: referred.locationId, referralDiscount: "true" },
    });

    await checkout(referred.locationId, { plan: "ESSENTIEL", interval: "YEAR" });
    expect(lastSession().discounts).toEqual([{ coupon: "referral-essentiel" }]);
  });

  it("gives no discount to a Business nobody referred", async () => {
    await checkout(unreferred.locationId, { plan: "PRO", interval: "MONTH" });

    expect(lastSession().discounts).toBeUndefined();
    expect(lastSession().metadata).toEqual({ locationId: unreferred.locationId });
  });

  it("replaces the referral discount with a campaign code", async () => {
    stripe.promotionCodes.list.mockResolvedValue({ data: [{ id: "promo_spring" }] });

    const response = await checkout(referred.locationId, { plan: "PRO", interval: "MONTH", promotionCode: "SPRING" });

    expect(response.status).toBe(201);
    expect(stripe.promotionCodes.list).toHaveBeenCalledWith({ code: "SPRING", active: true, limit: 1 });
    expect(lastSession().discounts).toEqual([{ promotion_code: "promo_spring" }]);
    expect(lastSession().metadata).toEqual({ locationId: referred.locationId });
  });

  it("refuses a code that doesn't exist, and one Stripe won't apply", async () => {
    stripe.promotionCodes.list.mockResolvedValue({ data: [] });
    const unknown = await checkout(referred.locationId, { plan: "PRO", interval: "MONTH", promotionCode: "NOPE" });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details).toEqual([expect.objectContaining({ property: "promotionCode" })]);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();

    stripe.promotionCodes.list.mockResolvedValue({ data: [{ id: "promo_first_time" }] });
    stripe.checkout.sessions.create.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        message: "This promotion code cannot be redeemed because the associated customer has prior transactions.",
        param: "discounts[0][promotion_code]",
      }),
    );
    const refused = await checkout(referred.locationId, { plan: "PRO", interval: "MONTH", promotionCode: "FIRST" });
    expect(refused.status).toBe(400);
    expect(refused.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("stops offering the referral discount once a checkout with it completes", async () => {
    const payload = JSON.stringify({
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: null,
          customer: `cus_${referred.businessId}`,
          metadata: { locationId: referred.locationId, referralDiscount: "true" },
        },
      },
    });
    const response = await request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", Stripe.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);
    expect(response.status).toBe(200);

    expect((await billing(referred.locationId)).body.referralDiscount).toBe(false);
    await checkout(referred.locationId, { plan: "PRO", interval: "MONTH" });
    expect(lastSession().discounts).toBeUndefined();
  });
});
