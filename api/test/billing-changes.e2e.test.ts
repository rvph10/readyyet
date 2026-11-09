// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { PrismaService } from "../src/database/prisma.service";
import { createBusiness, stripe } from "./support/billing";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// Hoisted by vitest above the imports, so the app gets the fake client.
vi.mock("../src/billing/stripe-client", async () => {
  const { stripe } = await import("./support/billing");
  return { getStripeClient: () => stripe };
});

describe("Changing and cancelling a paying location's plan", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let locationId: string;
  const subscriptionId = `sub_plan_${Date.now()}`;
  const periodEnd = Math.floor(Date.now() / 1000) + 20 * 24 * 60 * 60;

  const prices: Record<string, object> = {
    essentiel_monthly: {
      id: "price_em",
      lookup_key: "essentiel_monthly",
      unit_amount: 2900,
      recurring: { interval: "month" },
    },
    essentiel_yearly: {
      id: "price_ey",
      lookup_key: "essentiel_yearly",
      unit_amount: 29000,
      recurring: { interval: "year" },
    },
    pro_monthly: { id: "price_pm", lookup_key: "pro_monthly", unit_amount: 4900, recurring: { interval: "month" } },
    pro_yearly: { id: "price_py", lookup_key: "pro_yearly", unit_amount: 49000, recurring: { interval: "year" } },
  };
  // What Stripe answers for the subscription, on `key`'s price.
  const onStripe = (key: string, fields: object = {}) =>
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: subscriptionId,
      status: "active",
      customer: "cus_plan",
      metadata: { locationId },
      cancel_at_period_end: false,
      schedule: null,
      discounts: [],
      items: { data: [{ id: "si_1", current_period_end: periodEnd, price: prices[key] }] },
      ...fields,
    });
  const choose = (plan: string, interval: string, cookie = ownerCookie) =>
    request(app.getHttpServer())
      .post(`/locations/${locationId}/billing/plan`)
      .set("Cookie", cookie)
      .send({ plan, interval });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+plan-owner-${stamp}@resend.dev`);
    const adminEmail = `delivered+plan-admin-${stamp}@resend.dev`;
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
    ({ locationId } = await createBusiness(app, ownerCookie, "Plan Co"));
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: adminEmail, role: "ADMIN" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", adminCookie);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    stripe.prices.list.mockImplementation(({ lookup_keys: [key] }: { lookup_keys: string[] }) =>
      Promise.resolve({ data: [prices[key]] }),
    );
    stripe.subscriptions.update.mockResolvedValue({ pending_update: null });
    stripe.subscriptionSchedules.create.mockResolvedValue({
      id: "sub_sched_1",
      phases: [{ start_date: 1000, end_date: periodEnd, trial_end: null }],
    });
    await prisma.subscription.update({
      where: { locationId },
      data: { status: "ACTIVE", plan: "ESSENTIEL", interval: "MONTH", stripeSubscriptionId: subscriptionId },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const declined = () => new Stripe.errors.StripeCardError({ type: "card_error", message: "Your card was declined." });

  it("moves to Pro at once and prorated, all or nothing, lifting a cancellation in the same call", async () => {
    onStripe("essentiel_monthly", { cancel_at_period_end: true });

    const response = await choose("PRO", "MONTH", adminCookie);

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
      items: [{ id: "si_1", price: "price_pm" }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
      cancel_at_period_end: false,
    });
    expect(stripe.subscriptionSchedules.create).not.toHaveBeenCalled();
  });

  it("leaves a cancellation in place when the payment for a move up is declined", async () => {
    onStripe("essentiel_monthly", { cancel_at_period_end: true });
    stripe.subscriptions.update.mockRejectedValueOnce(declined());

    expect((await choose("PRO", "YEAR")).status).toBe(409);
    // The only call was the declined upgrade, nothing lifted the cancellation.
    expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
  });

  it("schedules again a waiting move to a cheaper price when the move up is declined", async () => {
    onStripe("essentiel_monthly", {
      schedule: {
        id: "sub_sched_0",
        phases: [
          { start_date: 1000, metadata: {} },
          { start_date: periodEnd, metadata: { lookupKey: "essentiel_yearly" } },
        ],
      },
    });
    stripe.subscriptions.update.mockRejectedValueOnce(declined());

    expect((await choose("PRO", "MONTH")).status).toBe(409);
    expect(stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_0");
    const [, { phases }] = stripe.subscriptionSchedules.update.mock.calls[0];
    expect(phases[1]).toMatchObject({ items: [{ price: "price_ey" }], metadata: { lookupKey: "essentiel_yearly" } });
  });

  it("waits for the period end to move to a cheaper price, through a schedule", async () => {
    onStripe("pro_monthly");

    const response = await choose("PRO", "YEAR");

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    expect(stripe.subscriptionSchedules.create).toHaveBeenCalledWith({ from_subscription: subscriptionId });
    expect(stripe.subscriptionSchedules.update).toHaveBeenCalledWith("sub_sched_1", {
      end_behavior: "release",
      phases: [
        { items: [{ price: "price_pm" }], start_date: 1000, end_date: periodEnd },
        {
          items: [{ price: "price_py" }],
          duration: { interval: "year", interval_count: 1 },
          proration_behavior: "none",
          metadata: { lookupKey: "pro_yearly" },
        },
      ],
    });
  });

  it("keeps the days left of a trial when the move waits for the period end", async () => {
    onStripe("pro_monthly", { status: "trialing" });
    stripe.subscriptionSchedules.create.mockResolvedValue({
      id: "sub_sched_1",
      phases: [{ start_date: 1000, end_date: periodEnd, trial_end: periodEnd }],
    });

    await choose("ESSENTIEL", "MONTH");

    const [, { phases }] = stripe.subscriptionSchedules.update.mock.calls[0];
    expect(phases[0]).toMatchObject({ start_date: 1000, end_date: periodEnd, trial_end: periodEnd });
  });

  it("refuses a move to Essentiel while the location has more than 2 members", async () => {
    onStripe("pro_monthly");
    await prisma.subscription.update({ where: { locationId }, data: { plan: "PRO" } });
    const invited = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: `delivered+plan-extra-${Date.now()}@resend.dev`, role: "EMPLOYEE" });
    expect(invited.status).toBe(201);

    const response = await choose("ESSENTIEL", "MONTH");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("MEMBER_LIMIT_REACHED");
    await prisma.invitation.updateMany({ where: { locationId }, data: { status: "REVOKED" } });
  });

  it("undoes a waiting change or cancellation when the current plan is chosen again", async () => {
    onStripe("pro_monthly", { cancel_at_period_end: true, schedule: { id: "sub_sched_1", phases: [] } });

    const response = await choose("PRO", "MONTH");

    expect(response.status).toBe(200);
    expect(stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_1");
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, { cancel_at_period_end: false });
  });

  it("refuses the plan the location is already on, with nothing waiting", async () => {
    onStripe("pro_monthly");

    expect((await choose("PRO", "MONTH")).status).toBe(409);
  });

  it("sends a location without a subscription to checkout", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { status: "ENDED" } });

    expect((await choose("PRO", "MONTH")).status).toBe(409);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("lets the owner cancel at the period end, not an admin", async () => {
    onStripe("pro_monthly");
    const cancel = (cookie: string) =>
      request(app.getHttpServer()).post(`/locations/${locationId}/billing/cancel`).set("Cookie", cookie);

    expect((await cancel(adminCookie)).status).toBe(403);
    expect((await cancel(ownerCookie)).status).toBe(200);
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, { cancel_at_period_end: true });

    onStripe("pro_monthly", { cancel_at_period_end: true });
    expect((await cancel(ownerCookie)).status).toBe(409);
  });

  it("keeps a running discount on both phases of a waiting move to a cheaper price", async () => {
    onStripe("pro_monthly", { discounts: ["di_referral"] });

    await choose("PRO", "YEAR");

    const [, { phases }] = stripe.subscriptionSchedules.update.mock.calls[0];
    expect(phases[0].discounts).toEqual([{ discount: "di_referral" }]);
    expect(phases[1].discounts).toEqual([{ discount: "di_referral" }]);
  });

  describe("a campaign code on a paying location", () => {
    const waitingSchedule = {
      id: "sub_sched_0",
      phases: [
        { start_date: 1000, metadata: {} },
        { start_date: periodEnd, metadata: { lookupKey: "essentiel_yearly" } },
      ],
    };
    const preview = (code: string, cookie = adminCookie) =>
      request(app.getHttpServer())
        .get(`/locations/${locationId}/billing/promotion-codes/${code}`)
        .set("Cookie", cookie);
    const apply = (promotionCode: string) =>
      request(app.getHttpServer())
        .post(`/locations/${locationId}/billing/promotion-code`)
        .set("Cookie", adminCookie)
        .send({ promotionCode });
    const refusedByStripe = () =>
      new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        message: "This promotion code cannot be redeemed.",
        param: "discounts[0][promotion_code]",
      });

    beforeEach(() => {
      stripe.promotionCodes.list.mockResolvedValue({ data: [{ id: "promo_autumn" }] });
      stripe.invoices.createPreview.mockImplementation((params: { discounts?: object[] }) =>
        Promise.resolve({ amount_due: params.discounts ? 2450 : 4900 }),
      );
    });

    it("previews the next invoice without and with the code", async () => {
      onStripe("pro_monthly");

      const response = await preview("AUTUMN");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ nextInvoiceAmount: 4900, nextInvoiceAmountWithCode: 2450 });
      expect(stripe.invoices.createPreview).toHaveBeenCalledWith({
        customer: "cus_plan",
        subscription: subscriptionId,
      });
      expect(stripe.invoices.createPreview).toHaveBeenCalledWith({
        customer: "cus_plan",
        subscription: subscriptionId,
        discounts: [{ promotion_code: "promo_autumn" }],
      });
    });

    it("previews the schedule's next phase when a move is waiting", async () => {
      onStripe("pro_monthly", { schedule: "sub_sched_0" });

      await preview("AUTUMN");

      expect(stripe.invoices.createPreview).toHaveBeenCalledWith({ customer: "cus_plan", schedule: "sub_sched_0" });
    });

    it("refuses a code that doesn't exist, one Stripe won't apply, and a location that doesn't pay", async () => {
      onStripe("pro_monthly");
      stripe.promotionCodes.list.mockResolvedValueOnce({ data: [] });
      expect((await preview("NOPE")).status).toBe(400);

      stripe.invoices.createPreview.mockImplementation((params: { discounts?: object[] }) =>
        params.discounts ? Promise.reject(refusedByStripe()) : Promise.resolve({ amount_due: 4900 }),
      );
      expect((await preview("FIRST")).status).toBe(400);

      await prisma.subscription.update({ where: { locationId }, data: { status: "TRIAL" } });
      expect((await preview("AUTUMN")).status).toBe(409);
      expect((await apply("AUTUMN")).status).toBe(409);
    });

    it("replaces the subscription's discount with the code", async () => {
      onStripe("pro_monthly");

      const response = await apply("AUTUMN");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "ACTIVE", plan: "PRO" });
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        discounts: [{ promotion_code: "promo_autumn" }],
      });
    });

    it("schedules a waiting move again, carrying the new discount", async () => {
      onStripe("pro_monthly", { schedule: waitingSchedule });
      stripe.subscriptions.update.mockResolvedValueOnce({
        id: subscriptionId,
        discounts: ["di_autumn"],
        items: { data: [{ id: "si_1", price: prices.pro_monthly }] },
      });

      await apply("AUTUMN");

      expect(stripe.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_0");
      const [, { phases }] = stripe.subscriptionSchedules.update.mock.calls[0];
      expect(phases[1]).toMatchObject({
        items: [{ price: "price_ey" }],
        metadata: { lookupKey: "essentiel_yearly" },
        discounts: [{ discount: "di_autumn" }],
      });
    });

    it("keeps a waiting move when Stripe refuses the code", async () => {
      onStripe("pro_monthly", { schedule: waitingSchedule });
      stripe.subscriptions.update.mockRejectedValueOnce(refusedByStripe());

      const response = await apply("FIRST");

      expect(response.status).toBe(400);
      const [, { phases }] = stripe.subscriptionSchedules.update.mock.calls[0];
      expect(phases[1]).toMatchObject({ metadata: { lookupKey: "essentiel_yearly" } });
    });

    it("is kept from employees", async () => {
      const employeeEmail = `delivered+plan-employee-${Date.now()}@resend.dev`;
      const employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
      const { id: userId } = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
      await prisma.membership.create({ data: { userId, locationId, role: "EMPLOYEE" } });

      expect((await preview("AUTUMN", employeeCookie)).status).toBe(403);
    });
  });
});

describe("Deleting a location", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+billing-delete-${Date.now()}@resend.dev`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const remove = (locationId: string) =>
    request(app.getHttpServer()).delete(`/locations/${locationId}`).set("Cookie", ownerCookie);

  // A Location of a Business that has paid before, so it has a Stripe customer.
  async function payingLocation(name: string) {
    const { businessId, locationId } = await createBusiness(app, ownerCookie, name);
    const customer = `cus_delete_${Date.now()}`;
    await prisma.business.update({ where: { id: businessId }, data: { stripeCustomerId: customer } });
    return { locationId, customer };
  }

  it("cancels its subscriptions and expires its open checkouts, found on Stripe, not the others'", async () => {
    const { locationId, customer } = await payingLocation("Closing Co");
    stripe.subscriptions.list.mockReturnValueOnce([
      { id: "sub_ours", status: "active", metadata: { locationId } },
      { id: "sub_other_location", status: "active", metadata: { locationId: "another" } },
    ]);
    stripe.checkout.sessions.list.mockReturnValueOnce([
      { id: "cs_ours", metadata: { locationId } },
      { id: "cs_other_location", metadata: { locationId: "another" } },
    ]);

    expect((await remove(locationId)).status).toBe(204);
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({ customer, limit: 100 });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_ours");
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledTimes(1);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_ours");
  });

  it("cancels a subscription whose webhook hasn't arrived yet, while the row still says trial", async () => {
    const { locationId } = await payingLocation("Racing Co");
    stripe.subscriptions.list.mockReturnValueOnce([
      { id: "sub_just_paid", status: "trialing", metadata: { locationId } },
    ]);

    expect((await remove(locationId)).status).toBe(204);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_just_paid");
  });

  it("has nothing to ask Stripe for a business that never paid", async () => {
    const { locationId } = await createBusiness(app, ownerCookie, "Trial Co");

    expect((await remove(locationId)).status).toBe(204);
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it("keeps the location when Stripe can't cancel, so it's never deleted while still billed", async () => {
    const { locationId } = await payingLocation("Stuck Co");
    stripe.subscriptions.list.mockReturnValueOnce([{ id: "sub_stuck", status: "active", metadata: { locationId } }]);
    stripe.subscriptions.cancel.mockRejectedValueOnce(new Error("Stripe is down"));

    expect((await remove(locationId)).status).toBe(500);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: locationId } })).deletedAt).toBeNull();
  });
});

describe("POST /businesses/:businessId/billing/portal", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let businessId: string;
  let locationId: string;

  const portal = (cookie: string) =>
    request(app.getHttpServer()).post(`/businesses/${businessId}/billing/portal`).set("Cookie", cookie);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+portal-owner-${stamp}@resend.dev`);
    const adminEmail = `delivered+portal-admin-${stamp}@resend.dev`;
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
    ({ businessId, locationId } = await createBusiness(app, ownerCookie, "Portal Co"));
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: adminEmail, role: "ADMIN" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", adminCookie);
    stripe.billingPortal.sessions.create.mockResolvedValue({ url: "https://billing.stripe.com/p/session/test" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("has nothing to show before the business has paid", async () => {
    expect((await portal(ownerCookie)).status).toBe(409);
  });

  it("opens the business's Stripe customer for its owner", async () => {
    await prisma.business.update({ where: { id: businessId }, data: { stripeCustomerId: `cus_portal_${Date.now()}` } });

    const response = await portal(ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: "https://billing.stripe.com/p/session/test" });
  });

  it("is the owner's alone", async () => {
    expect((await portal(adminCookie)).status).toBe(403);
  });
});

describe("Transferring a business that pays", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // Owner and Admin of a Business with a Stripe customer, ready to transfer.
  async function payingBusiness(tag: string) {
    const stamp = Date.now();
    const ownerCookie = await signInViaOtp(app, prisma, `delivered+transfer-${tag}-owner-${stamp}@resend.dev`);
    const adminEmail = `delivered+transfer-${tag}-admin-${stamp}@resend.dev`;
    const adminCookie = await signInViaOtp(app, prisma, adminEmail);
    const { businessId, locationId } = await createBusiness(app, ownerCookie, "Handover Co");
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: adminEmail, role: "ADMIN" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", adminCookie);
    const customerId = `cus_handover_${stamp}`;
    await prisma.business.update({ where: { id: businessId }, data: { stripeCustomerId: customerId } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const transfer = () =>
      request(app.getHttpServer())
        .post(`/businesses/${businessId}/transfer-ownership`)
        .set("Cookie", ownerCookie)
        .send({ userId: admin.id });
    return { adminEmail, customerId, transfer };
  }

  it("moves the Stripe customer's email, where invoices go, to the new owner", async () => {
    const { adminEmail, customerId, transfer } = await payingBusiness("ok");

    expect((await transfer()).status).toBe(200);
    expect(stripe.customers.update).toHaveBeenCalledWith(customerId, { email: adminEmail });
  });

  it("still reports the transfer and sends its emails when Stripe fails", async () => {
    const { adminEmail, transfer } = await payingBusiness("stripe-down");
    stripe.customers.update.mockRejectedValueOnce(new Error("Stripe is down"));

    expect((await transfer()).status).toBe(200);
    expect(await prisma.emailLog.count({ where: { to: adminEmail, type: "ownership_received" } })).toBe(1);
  });
});
