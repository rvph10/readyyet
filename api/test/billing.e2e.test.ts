// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// Stripe is never called from tests, only the requests sent to it are
// checked. Hoisted by vitest above the imports, so the app gets the fake.
const stripe = vi.hoisted(() => ({
  customers: { create: vi.fn() },
  prices: { list: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
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
