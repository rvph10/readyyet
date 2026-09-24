// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// Stripe is never called from tests, only the requests sent to it are
// checked. Hoisted by vitest above the imports, so the app gets the fake.
const stripe = vi.hoisted(() => ({
  customers: { create: vi.fn() },
  prices: { list: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  subscriptions: { retrieve: vi.fn() },
}));
vi.mock("../src/billing/stripe-client", () => ({ getStripeClient: () => stripe }));

async function createBusiness(app: INestApplication, cookie: string, name: string) {
  const created = await request(app.getHttpServer())
    .post("/businesses")
    .set("Cookie", cookie)
    .send({
      name,
      location: {
        name: "Main Shop",
        businessTypeCode: "GARAGE",
        contactPhone: "+12125550123",
        contactEmail: "main@billing.test",
        locale: "EN",
      },
    });
  return { businessId: created.body.id as string, locationId: created.body.locations[0].id as string };
}

describe("GET /locations/:locationId/billing", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+billing-owner-${stamp}@resend.dev`);
    const employeeEmail = `delivered+billing-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);

    ({ locationId } = await createBusiness(app, ownerCookie, "Billing Co"));

    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", employeeCookie);
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows the owner a Pro trial, not frozen and unlimited", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "TRIAL",
      plan: "PRO",
      interval: null,
      frozen: false,
      memberLimit: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("is frozen once the trial is over", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { trialEndsAt: new Date(Date.now() - 1000) } });

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);

    expect(response.body).toMatchObject({ status: "TRIAL", frozen: true });
  });

  it("holds Essentiel to 2 members, and so does a move to it waiting for the period end", async () => {
    await prisma.subscription.update({
      where: { locationId },
      data: { status: "ACTIVE", plan: "ESSENTIEL", interval: "MONTH", currentPeriodEnd: new Date(Date.now() + 1e9) },
    });
    const essentiel = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);
    expect(essentiel.body).toMatchObject({ plan: "ESSENTIEL", frozen: false, memberLimit: 2 });

    await prisma.subscription.update({ where: { locationId }, data: { plan: "PRO", scheduledPlan: "ESSENTIEL" } });
    const scheduled = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);
    expect(scheduled.body).toMatchObject({ plan: "PRO", scheduledPlan: "ESSENTIEL", memberLimit: 2 });
  });

  it("is kept from employees", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", employeeCookie);

    expect(response.status).toBe(403);
  });
});

describe("POST /locations/:locationId/billing/checkout", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let ownerEmail: string;
  let businessId: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerEmail = `delivered+checkout-owner-${Date.now()}@resend.dev`;
    ownerCookie = await signInViaOtp(app, prisma, ownerEmail);
    ({ businessId, locationId } = await createBusiness(app, ownerCookie, "Checkout Co"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stripe.customers.create.mockResolvedValue({ id: `cus_${businessId}` });
    stripe.prices.list.mockResolvedValue({ data: [{ id: "price_pro_monthly" }] });
    stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test" });
  });

  afterAll(async () => {
    await app.close();
  });

  const checkout = (body: object) =>
    request(app.getHttpServer())
      .post(`/locations/${locationId}/billing/checkout`)
      .set("Cookie", ownerCookie)
      .send(body);

  it("creates the Business's Stripe customer once, and a checkout keeping the trial's days", async () => {
    const response = await checkout({ plan: "PRO", interval: "MONTH" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test" });
    expect(stripe.customers.create).toHaveBeenCalledWith(
      { name: "Checkout Co", email: ownerEmail, metadata: { businessId } },
      { idempotencyKey: `customer-${businessId}` },
    );
    expect(stripe.prices.list).toHaveBeenCalledWith({ lookup_keys: ["pro_monthly"], active: true });

    const { trialEndsAt } = await prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    const session = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(session).toMatchObject({
      mode: "subscription",
      customer: `cus_${businessId}`,
      line_items: [{ price: "price_pro_monthly", quantity: 1 }],
      subscription_data: { metadata: { locationId }, trial_end: Math.floor(trialEndsAt!.getTime() / 1000) },
      tax_id_collection: { enabled: true },
    });

    await checkout({ plan: "PRO", interval: "MONTH" });
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
  });

  it("charges at once when less than 48 hours of trial are left, Stripe's minimum", async () => {
    await prisma.subscription.update({
      where: { locationId },
      data: { trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    await checkout({ plan: "PRO", interval: "YEAR" });

    expect(stripe.prices.list).toHaveBeenCalledWith({ lookup_keys: ["pro_yearly"], active: true });
    expect(stripe.checkout.sessions.create.mock.calls[0][0].subscription_data.trial_end).toBeUndefined();
  });

  it("refuses Essentiel while the location has more than 2 members and invitations", async () => {
    for (const n of [1, 2]) {
      await request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie)
        .send({ email: `delivered+checkout-invitee-${n}-${Date.now()}@resend.dev`, role: "EMPLOYEE" });
    }

    const response = await checkout({ plan: "ESSENTIEL", interval: "MONTH" });

    expect(response.status).toBe(409);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("refuses a location that already pays, its plan is changed instead", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { status: "ACTIVE" } });

    const response = await checkout({ plan: "PRO", interval: "MONTH" });

    expect(response.status).toBe(409);
  });

  it("rejects an unknown plan", async () => {
    const response = await checkout({ plan: "GOLD", interval: "MONTH" });

    expect(response.status).toBe(400);
  });
});

describe("POST /webhooks/stripe", () => {
  const secret = "whsec_test_only_used_in_this_suite";
  let app: INestApplication;
  let prisma: PrismaService;
  let locationId: string;
  let previousSecret: string | undefined;

  // Stripe ids are unique, and so is the column, across test runs too.
  const sub1 = `sub_1_${Date.now()}`;
  const sub2 = `sub_2_${Date.now()}`;
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const subscription = (fields: object = {}) => ({
    id: sub1,
    status: "active",
    metadata: { locationId },
    cancel_at_period_end: false,
    schedule: null,
    items: { data: [{ current_period_end: periodEnd, price: { lookup_key: "pro_monthly" } }] },
    ...fields,
  });

  const send = (event: object, signature?: string) => {
    const payload = JSON.stringify(event);
    return request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature ?? Stripe.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);
  };
  const subscriptionEvent = (type: string, id = sub1) => ({ id: "evt_1", type, data: { object: { id } } });

  beforeAll(async () => {
    previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const cookie = await signInViaOtp(app, prisma, `delivered+stripe-webhook-${Date.now()}@resend.dev`);
    ({ locationId } = await createBusiness(app, cookie, "Webhook Co"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    await app.close();
  });

  it("writes the subscription Stripe has now once checkout completes", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(subscription());

    const response = await send({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { subscription: sub1 } },
    });

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(sub1, { expand: ["schedule"] });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { locationId } })).toMatchObject({
      status: "ACTIVE",
      plan: "PRO",
      interval: "MONTH",
      stripeSubscriptionId: sub1,
      currentPeriodEnd: new Date(periodEnd * 1000),
    });
  });

  it("records a scheduled move to a cheaper price, and a cancellation", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription({
        cancel_at_period_end: true,
        schedule: {
          phases: [
            { start_date: periodEnd - 1000, metadata: {} },
            { start_date: periodEnd, metadata: { lookupKey: "essentiel_yearly" } },
          ],
        },
      }),
    );

    await send(subscriptionEvent("customer.subscription.updated"));

    expect(await prisma.subscription.findUniqueOrThrow({ where: { locationId } })).toMatchObject({
      cancelAtPeriodEnd: true,
      scheduledPlan: "ESSENTIEL",
      scheduledInterval: "YEAR",
    });
  });

  it("keeps the location working while payments are retried, and freezes it once Stripe gives up", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: "past_due" }));
    await send(subscriptionEvent("customer.subscription.updated"));
    expect(await prisma.subscription.findUniqueOrThrow({ where: { locationId } })).toMatchObject({
      status: "PAST_DUE",
    });

    stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: "canceled" }));
    await send(subscriptionEvent("customer.subscription.deleted"));
    expect(await prisma.subscription.findUniqueOrThrow({ where: { locationId } })).toMatchObject({
      status: "ENDED",
    });
  });

  it("doesn't let the end of an older subscription freeze a location that paid again", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(subscription({ id: sub2 }));
    await send(subscriptionEvent("customer.subscription.created", sub2));

    stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: "canceled" }));
    await send(subscriptionEvent("customer.subscription.deleted"));

    expect(await prisma.subscription.findUniqueOrThrow({ where: { locationId } })).toMatchObject({
      status: "ACTIVE",
      stripeSubscriptionId: sub2,
    });
  });

  it("ignores subscriptions that aren't a location's and events it doesn't use", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(subscription({ metadata: {} }));
    expect((await send(subscriptionEvent("customer.subscription.updated"))).status).toBe(200);

    expect((await send({ id: "evt_2", type: "invoice.paid", data: { object: {} } })).status).toBe(200);
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledTimes(1);
  });

  it("rejects a request not signed by Stripe", async () => {
    const response = await send(subscriptionEvent("customer.subscription.updated"), "t=1,v1=forged");

    expect(response.status).toBe(400);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
});

describe("What a location's plan allows", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let locationId: string;

  const invite = (email: string) =>
    request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role: "EMPLOYEE" });
  const createTicket = () =>
    request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Brake inspection", customer: { fullName: "Alice Driver" } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+plan-limits-${Date.now()}@resend.dev`);
    ({ locationId } = await createBusiness(app, ownerCookie, "Limits Co"));
  });

  afterAll(async () => {
    await app.close();
  });

  it("freezes new tickets and invitations once the trial is over, not what's already there", async () => {
    const ticket = await createTicket();
    const pending = await invite(`delivered+plan-limits-pending-${Date.now()}@resend.dev`);
    await prisma.subscription.update({ where: { locationId }, data: { trialEndsAt: new Date(Date.now() - 1000) } });

    const frozenTicket = await createTicket();
    expect(frozenTicket.status).toBe(402);
    expect(frozenTicket.body.error.code).toBe("LOCATION_FROZEN");
    expect((await invite(`delivered+plan-limits-new-${Date.now()}@resend.dev`)).status).toBe(402);
    const resent = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations/${pending.body.id}/resend`)
      .set("Cookie", ownerCookie);
    expect(resent.status).toBe(402);

    const moved = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticket.body.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "READY" });
    expect(moved.status).toBe(200);
    expect((await request(app.getHttpServer()).get(`/tracking/${ticket.body.trackingCode}`)).status).toBe(200);
  });

  it("holds Essentiel to 2 members counting pending invitations, a resend adds no one", async () => {
    await prisma.invitation.updateMany({ where: { locationId }, data: { status: "REVOKED" } });
    await prisma.subscription.update({
      where: { locationId },
      data: { status: "ACTIVE", plan: "ESSENTIEL", interval: "MONTH" },
    });

    const second = await invite(`delivered+plan-limits-second-${Date.now()}@resend.dev`);
    expect(second.status).toBe(201);

    const third = await invite(`delivered+plan-limits-third-${Date.now()}@resend.dev`);
    expect(third.status).toBe(409);
    expect(third.body.error.code).toBe("MEMBER_LIMIT_REACHED");

    const resent = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations/${second.body.id}/resend`)
      .set("Cookie", ownerCookie);
    expect(resent.status).toBe(200);
  });

  it("lets Pro invite past 2", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { plan: "PRO" } });

    expect((await invite(`delivered+plan-limits-pro-${Date.now()}@resend.dev`)).status).toBe(201);
  });
});
