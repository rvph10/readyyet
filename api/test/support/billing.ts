import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { vi, type Mock } from "vitest";

// Stripe is never called from tests, only the requests sent to it are
// checked. Test files swap it in with vi.mock of src/billing/stripe-client.
const fn = (): Mock => vi.fn();
// Lists are iterated with for await, an empty array stands for "none".
const list = (): Mock => vi.fn(() => []);
export const stripe = {
  customers: { create: fn(), update: fn() },
  prices: { list: fn() },
  promotionCodes: { list: fn() },
  checkout: { sessions: { create: fn(), list: list(), expire: fn() } },
  subscriptions: { retrieve: fn(), update: fn(), cancel: fn(), list: list() },
  subscriptionSchedules: { create: fn(), update: fn(), release: fn() },
  billingPortal: { sessions: { create: fn() } },
};

export async function createBusiness(app: INestApplication, cookie: string, name: string) {
  const created = await request(app.getHttpServer())
    .post("/businesses")
    .set("Cookie", cookie)
    .send({
      name,
      location: {
        name: "Main Shop",
        businessTypeCode: "GARAGE",
        timeZone: "Europe/Brussels",
        contactPhone: "+12125550123",
        contactEmail: "main@billing.test",
        locale: "EN",
      },
    });
  return { businessId: created.body.id as string, locationId: created.body.locations[0].id as string };
}
