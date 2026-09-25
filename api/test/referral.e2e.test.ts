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

describe("The sponsor's credit, on the referred Business's first paid invoice", () => {
  const secret = "whsec_test_only_used_in_this_suite";
  let app: INestApplication;
  let prisma: PrismaService;
  let previousSecret: string | undefined;
  let sponsorId: string;
  let referredId: string;
  const stamp = Date.now();
  // Charged an hour after its period started, the usual delay.
  const periodStart = Math.floor(Date.now() / 1000) - 2 * 3600;
  const month = 30 * 24 * 60 * 60;

  const invoice = (customer: string, amountPaid: number, start = periodStart) => ({
    id: `in_${stamp}_${start}`,
    customer,
    amount_paid: amountPaid,
    total_taxes: [],
    status_transitions: { paid_at: start + 3600 },
    lines: { data: [{ period: { start, end: start + month } }] },
    parent: { subscription_details: { subscription: "sub_referred" } },
  });

  function sendInvoicePaid(object: object) {
    const payload = JSON.stringify({ id: "evt_invoice", type: "invoice.paid", data: { object } });
    return request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", Stripe.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);
  }

  function business(id: string) {
    return prisma.business.findUniqueOrThrow({ where: { id } });
  }

  beforeAll(async () => {
    previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const owner = await prisma.user.create({
      data: { id: `credit-owner-${stamp}`, email: `credit-owner-${stamp}@referral.test`, name: "Owner" },
    });
    const sponsor = await prisma.business.create({
      data: { ownerId: owner.id, name: "Sponsor", referralCode: `cs${stamp}` },
    });
    sponsorId = sponsor.id;
    const referred = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Referred",
        referralCode: `cr${stamp}`,
        referredByBusinessId: sponsor.id,
        stripeCustomerId: `cus_referred_${stamp}`,
      },
    });
    referredId = referred.id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stripe.subscriptions.retrieve.mockResolvedValue({ items: { data: [{ price: { lookup_key: "pro_yearly" } }] } });
    stripe.prices.list.mockResolvedValue({ data: [{ unit_amount: 4900, currency: "eur" }] });
    stripe.customers.create.mockResolvedValue({ id: `cus_sponsor_${stamp}` });
  });

  afterAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  it("ignores an invoice for zero, like the one a trial starts with", async () => {
    await sendInvoicePaid(invoice(`cus_referred_${stamp}`, 0)).expect(200);

    expect(await business(referredId)).toMatchObject({ paidFrom: null, sponsorCreditedAt: null });
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
  });

  it("keeps the credit for a later delivery when Stripe fails to take it", async () => {
    stripe.customers.createBalanceTransaction.mockRejectedValueOnce(new Error("Stripe is down"));

    await sendInvoicePaid(invoice(`cus_referred_${stamp}`, 4900)).expect(500);

    // A sponsor who never paid gets a Customer to hold the credit.
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { businessId: sponsorId } }),
      { idempotencyKey: `customer-${sponsorId}` },
    );

    expect(await business(referredId)).toMatchObject({
      paidFrom: new Date(periodStart * 1000),
      sponsorCreditedAt: null,
    });
  });

  it("credits one month of the chosen plan at the monthly price, on the sponsor's Customer", async () => {
    await sendInvoicePaid(invoice(`cus_referred_${stamp}`, 4900)).expect(200);

    // The plan is Pro, chosen yearly, the credit is a month at Pro's monthly price.
    expect(stripe.prices.list).toHaveBeenCalledWith({ lookup_keys: ["pro_monthly"], active: true });
    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
      `cus_sponsor_${stamp}`,
      { amount: -4900, currency: "eur", description: "Referral reward" },
      { idempotencyKey: `sponsor-credit-${referredId}` },
    );
    expect((await business(sponsorId)).stripeCustomerId).toBe(`cus_sponsor_${stamp}`);
    expect((await business(referredId)).sponsorCreditedAt).toBeInstanceOf(Date);
  });

  it("credits once, and keeps where the first paid invoice's period started", async () => {
    await sendInvoicePaid(invoice(`cus_referred_${stamp}`, 4900, periodStart + month)).expect(200);

    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
    expect((await business(referredId)).paidFrom).toEqual(new Date(periodStart * 1000));
  });

  it("marks the first paid invoice of a Business nobody referred, without a credit", async () => {
    await prisma.business.update({ where: { id: sponsorId }, data: { paidFrom: null } });

    await sendInvoicePaid(invoice(`cus_sponsor_${stamp}`, 2900)).expect(200);

    expect((await business(sponsorId)).paidFrom).toEqual(new Date(periodStart * 1000));
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
  });

  it("ignores a Customer that isn't a Business's", async () => {
    await sendInvoicePaid(invoice("cus_someone_else", 4900)).expect(200);

    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled();
  });
});

describe("A sales partner's commissions", () => {
  const secret = "whsec_test_only_used_in_this_suite";
  let app: INestApplication;
  let prisma: PrismaService;
  let previousSecret: string | undefined;
  let salesPartnerId: string;
  let ownerId: string;
  const stamp = Date.now();
  // A day ago, so every invoice below is already paid.
  const firstPeriod = Math.floor(Date.now() / 1000) - 24 * 3600;
  let invoices = 0;

  function monthsAfter(seconds: number, months: number) {
    const date = new Date(seconds * 1000);
    date.setUTCMonth(date.getUTCMonth() + months);
    return Math.floor(date.getTime() / 1000);
  }

  async function referredBusiness() {
    const customer = `cus_partner_${stamp}_${++invoices}`;
    const business = await prisma.business.create({
      data: {
        ownerId,
        name: "Partner Referred",
        referralCode: `pr${stamp}${invoices}`,
        referredBySalesPartnerId: salesPartnerId,
        stripeCustomerId: customer,
      },
    });
    return { id: business.id, customer };
  }

  const invoice = (customer: string, amountPaid: number, start: number, end: number, fields: object = {}) => ({
    id: `in_partner_${stamp}_${++invoices}`,
    customer,
    amount_paid: amountPaid,
    total_taxes: [],
    status_transitions: { paid_at: Math.min(start + 3600, Math.floor(Date.now() / 1000)) },
    lines: { data: [{ period: { start, end } }] },
    parent: { subscription_details: { subscription: "sub_partner" } },
    ...fields,
  });

  function send(type: string, object: object, created = Math.floor(Date.now() / 1000)) {
    const payload = JSON.stringify({ id: "evt_partner", type, created, data: { object } });
    return request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", Stripe.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);
  }

  const commissionsOf = (businessId: string) =>
    prisma.commission.findMany({ where: { businessId }, orderBy: { invoicePaidAt: "asc" } });

  beforeAll(async () => {
    previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const partner = await prisma.user.create({
      data: {
        id: `commission-partner-${stamp}`,
        email: `commission-partner-${stamp}@referral.test`,
        name: "Partner",
        salesPartnerSince: new Date(),
        referralCode: `cp${stamp}`,
      },
    });
    salesPartnerId = partner.id;
    const owner = await prisma.user.create({
      data: { id: `commission-owner-${stamp}`, email: `commission-owner-${stamp}@referral.test`, name: "Owner" },
    });
    ownerId = owner.id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  it("records 35% of what the card was charged, VAT excluded, once per invoice", async () => {
    const business = await referredBusiness();
    // €49 plus 21% VAT.
    const paid = invoice(business.customer, 5929, firstPeriod, monthsAfter(firstPeriod, 1), {
      total_taxes: [{ amount: 1029 }],
    });

    await send("invoice.paid", paid).expect(200);
    await send("invoice.paid", paid).expect(200);

    expect(await commissionsOf(business.id)).toEqual([
      expect.objectContaining({
        salesPartnerId,
        stripeInvoiceId: paid.id,
        amount: 1715,
        invoicePaidAt: new Date(paid.status_transitions.paid_at * 1000),
        voidedAt: null,
        paidAt: null,
      }),
    ]);
  });

  it("counts the 6 monthly invoices from the first paid one, not the 7th", async () => {
    const business = await referredBusiness();
    for (let month = 0; month <= 6; month++) {
      const start = monthsAfter(firstPeriod, month);
      await send("invoice.paid", invoice(business.customer, 4900, start, monthsAfter(start, 1))).expect(200);
    }

    const commissions = await commissionsOf(business.id);
    expect(commissions).toHaveLength(6);
    expect(commissions.every((commission) => commission.amount === 1715)).toBe(true);
  });

  it("counts a yearly invoice for its share of months inside the 6", async () => {
    const business = await referredBusiness();

    await send("invoice.paid", invoice(business.customer, 49000, firstPeriod, monthsAfter(firstPeriod, 12))).expect(
      200,
    );

    const [commission] = await commissionsOf(business.id);
    expect(commission.amount / (49000 * 0.35)).toBeCloseTo(0.5, 1);
  });

  it("counts nothing for an invoice for zero, and nothing once the status is removed", async () => {
    const business = await referredBusiness();
    await send("invoice.paid", invoice(business.customer, 0, firstPeriod, monthsAfter(firstPeriod, 1))).expect(200);
    expect(await commissionsOf(business.id)).toEqual([]);

    await prisma.user.update({ where: { id: salesPartnerId }, data: { salesPartnerSince: null } });
    await send("invoice.paid", invoice(business.customer, 4900, firstPeriod, monthsAfter(firstPeriod, 1))).expect(200);
    expect(await commissionsOf(business.id)).toEqual([]);
    await prisma.user.update({ where: { id: salesPartnerId }, data: { salesPartnerSince: new Date() } });
  });

  it("voids a commission when its invoice is refunded or disputed within 14 days", async () => {
    const business = await referredBusiness();
    const refunded = invoice(business.customer, 4900, firstPeriod, monthsAfter(firstPeriod, 1));
    await send("invoice.paid", refunded).expect(200);
    stripe.invoicePayments.list.mockResolvedValue({ data: [{ invoice: refunded.id }] });

    await send("charge.refunded", { id: "ch_refunded", payment_intent: "pi_refunded" }).expect(200);

    expect(stripe.invoicePayments.list).toHaveBeenCalledWith({
      payment: { type: "payment_intent", payment_intent: "pi_refunded" },
      limit: 1,
    });
    expect((await commissionsOf(business.id))[0].voidedAt).toBeInstanceOf(Date);

    const disputed = invoice(business.customer, 4900, monthsAfter(firstPeriod, 1), monthsAfter(firstPeriod, 2), {
      status_transitions: { paid_at: firstPeriod + 3600 },
    });
    await send("invoice.paid", disputed).expect(200);
    stripe.invoicePayments.list.mockResolvedValue({ data: [{ invoice: disputed.id }] });
    await send("charge.dispute.created", { id: "dp_1", payment_intent: "pi_disputed" }).expect(200);
    expect(
      (await prisma.commission.findUniqueOrThrow({ where: { stripeInvoiceId: disputed.id } })).voidedAt,
    ).toBeInstanceOf(Date);
  });

  it("voids by when the refund happened, even when its webhook arrives after the 14 days", async () => {
    const business = await referredBusiness();
    const paidAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const commission = await prisma.commission.create({
      data: {
        salesPartnerId,
        businessId: business.id,
        stripeInvoiceId: `in_late_${stamp}`,
        amount: 1715,
        invoicePaidAt: paidAt,
      },
    });
    stripe.invoicePayments.list.mockResolvedValue({ data: [{ invoice: commission.stripeInvoiceId }] });
    const refundedOnDay13 = Math.floor(paidAt.getTime() / 1000) + 13 * 24 * 60 * 60;

    await send("charge.refunded", { id: "ch_retried", payment_intent: "pi_retried" }, refundedOnDay13).expect(200);

    expect((await prisma.commission.findUniqueOrThrow({ where: { id: commission.id } })).voidedAt).toEqual(
      new Date(refundedOnDay13 * 1000),
    );
  });

  it("leaves a commission already paid out as it is, for the platform admin to sort out", async () => {
    const business = await referredBusiness();
    const paidAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const commission = await prisma.commission.create({
      data: {
        salesPartnerId,
        businessId: business.id,
        stripeInvoiceId: `in_paid_out_${stamp}`,
        amount: 1715,
        invoicePaidAt: paidAt,
        paidAt: new Date(),
      },
    });
    stripe.invoicePayments.list.mockResolvedValue({ data: [{ invoice: commission.stripeInvoiceId }] });
    const refundedOnDay13 = Math.floor(paidAt.getTime() / 1000) + 13 * 24 * 60 * 60;

    await send("charge.refunded", { id: "ch_paid_out", payment_intent: "pi_paid_out" }, refundedOnDay13).expect(200);

    expect(await prisma.commission.findUniqueOrThrow({ where: { id: commission.id } })).toMatchObject({
      voidedAt: null,
      paidAt: expect.any(Date),
    });
  });

  it("leaves a commission owed when the refund comes after 14 days", async () => {
    const business = await referredBusiness();
    const commission = await prisma.commission.create({
      data: {
        salesPartnerId,
        businessId: business.id,
        stripeInvoiceId: `in_old_${stamp}`,
        amount: 1715,
        invoicePaidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    });
    stripe.invoicePayments.list.mockResolvedValue({ data: [{ invoice: commission.stripeInvoiceId }] });

    await send("charge.refunded", { id: "ch_late", payment_intent: "pi_late" }).expect(200);

    expect((await prisma.commission.findUniqueOrThrow({ where: { id: commission.id } })).voidedAt).toBeNull();
  });
});
