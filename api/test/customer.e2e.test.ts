// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

async function createTicketWithCustomer(app: INestApplication, cookie: string, locationId: string, fullName: string) {
  const response = await request(app.getHttpServer())
    .post(`/locations/${locationId}/tickets`)
    .set("Cookie", cookie)
    .send({ title: "Job", customer: { fullName } });
  return response.body.customer.id as string;
}

describe("Customers", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+customer-owner-${stamp}@resend.dev`);
    otherCookie = await signInViaOtp(app, prisma, `delivered+customer-other-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Customer Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550123",
          contactEmail: "shop@customertest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    aliceId = await createTicketWithCustomer(app, ownerCookie, locationId, "Alice Wonder");
    bobId = await createTicketWithCustomer(app, ownerCookie, locationId, "Bob Builder");
  });

  afterAll(async () => {
    await app.close();
  });

  it("finds a customer by partial name match", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "wonder" })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(aliceId);
    expect(response.body.nextCursor).toBeNull();
  });

  it("gets a customer's full detail", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe("Bob Builder");
  });

  it("updates a customer's contact info", async () => {
    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie)
      .send({ email: "bob@example.test" });

    expect(patched.status).toBe(200);
    expect(patched.body.email).toBe("bob@example.test");

    const refetched = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${bobId}`)
      .set("Cookie", ownerCookie);
    expect(refetched.body.email).toBe("bob@example.test");
  });

  it("shows staff an address that fails, until they change it", async () => {
    const customerId = await createTicketWithCustomer(app, ownerCookie, locationId, "Carol Typo");
    const path = `/locations/${locationId}/customers/${customerId}`;
    await prisma.customer.update({
      where: { id: BigInt(customerId) },
      data: {
        email: "delivered+customer-carol-old@resend.dev",
        emailBouncedAt: new Date(),
        emailComplainedAt: new Date(),
      },
    });
    const update = (email: string) =>
      request(app.getHttpServer()).patch(path).set("Cookie", ownerCookie).send({ email });

    const flagged = await request(app.getHttpServer()).get(path).set("Cookie", ownerCookie);
    expect(flagged.body.emailBouncedAt).toEqual(expect.any(String));
    expect(flagged.body.emailComplainedAt).toEqual(expect.any(String));

    const unchanged = await update("delivered+customer-carol-old@resend.dev");
    expect(unchanged.body.emailBouncedAt).toEqual(expect.any(String));

    const fixed = await update("delivered+customer-carol-new@resend.dev");
    expect(fixed.body).toMatchObject({ emailBouncedAt: null, emailComplainedAt: null });
  });

  it("won't resend a tracking link to an address that fails, saying why", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Job", customer: { fullName: "Dan Bounce" } });
    await prisma.customer.update({
      where: { id: BigInt(created.body.customer.id) },
      data: { email: "delivered+customer-dan-bounce@resend.dev", emailBouncedAt: new Date() },
    });

    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${created.body.id}/resend-link`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/fail/);
    expect(await prisma.emailLog.count({ where: { to: "delivered+customer-dan-bounce@resend.dev" } })).toBe(0);
  });

  it("soft-deletes a customer, removing it from get and list", async () => {
    const customerId = await createTicketWithCustomer(app, ownerCookie, locationId, "Carol Deleteme");

    const deleted = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${customerId}`)
      .set("Cookie", ownerCookie);
    expect(deleted.status).toBe(204);

    const get = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers/${customerId}`)
      .set("Cookie", ownerCookie);
    expect(get.status).toBe(404);

    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "Deleteme" })
      .set("Cookie", ownerCookie);
    expect(list.body.items).toHaveLength(0);

    // Erasure, not a plain flag: the row survives (a Ticket references it,
    // onDelete: Restrict) but its PII is actually redacted, not just
    // deletedAt set. See docs/architecture/data-model.md#gdpr-erasure.
    const raw = await prisma.customer.findUniqueOrThrow({ where: { id: BigInt(customerId) } });
    expect(raw.fullName).not.toContain("Carol");
    expect(raw.email).toBeNull();
    expect(raw.phone).toBeNull();

    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "For an erased customer", customerId });
    expect(ticket.status).toBe(404);
  });

  it("pages through customers by name, each one exactly once", async () => {
    const names: string[] = [];
    let cursor: string | null = null;
    do {
      const response: request.Response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers`)
        .query(cursor ? { take: 1, cursor } : { take: 1 })
        .set("Cookie", ownerCookie);
      expect(response.status).toBe(200);
      names.push(...response.body.items.map((customer: { fullName: string }) => customer.fullName));
      cursor = response.body.nextCursor;
      // Only the id: the cursor is in the URL, which the logs and Railway's
      // proxy record, so it can't carry the customer's name.
      if (cursor) {
        expect(cursor).toBe(response.body.items[0].id);
      }
    } while (cursor);

    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(["not-a-cursor", "99999999999999999999", "999999999"])("rejects the malformed cursor %s", async (cursor) => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ cursor })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects another location's customer as a cursor", async () => {
    const other = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", otherCookie)
      .send({
        name: "Other Garage",
        location: {
          name: "Other Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550124",
          contactEmail: "shop@othercustomertest.test",
          locale: "EN",
        },
      });
    const foreignId = await createTicketWithCustomer(app, otherCookie, other.body.locations[0].id, "Carol Foreign");

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ cursor: foreignId })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
  });

  it.each(["not-a-number", "99999999999999999999"])(
    "returns 404, not a raw DB error, for the customer id %s",
    async (customerId) => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers/${customerId}`)
        .set("Cookie", ownerCookie);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    },
  );
});
