// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { EmailService } from "../src/email/email.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";
import { TERMS_VERSION } from "@readyyet/shared";

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
        termsVersion: TERMS_VERSION,
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

  it("lists A to Z unless asked otherwise", async () => {
    const names = async (query: Record<string, string>) => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers`)
        .query({ ...query, take: "100" })
        .set("Cookie", ownerCookie);
      return (response.body.items as { fullName: string }[]).map(({ fullName }) => fullName);
    };
    const az = await names({});
    expect(az.indexOf("Alice Wonder")).toBeLessThan(az.indexOf("Bob Builder"));
    expect(await names({ sort: "name", dir: "desc" })).toEqual([...az].reverse());
    const newest = await names({ sort: "since", dir: "desc" });
    expect(newest.indexOf("Bob Builder")).toBeLessThan(newest.indexOf("Alice Wonder"));
  });

  it("finds a customer by partial name match", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "wonder" })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(aliceId);
    expect(response.body.total).toBe(1);
  });

  it("treats % and _ in a search as the characters they are, not wildcards", async () => {
    for (const q of ["__", "%%"]) {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers`)
        .query({ q })
        .set("Cookie", ownerCookie);
      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
    }
  });

  it("finds a name whatever its accents, either way round", async () => {
    await createTicketWithCustomer(app, ownerCookie, locationId, "Hélène Lefèvre");
    for (const q of ["helene", "HÉLÈNE", "lefevre", "Hélene"]) {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers`)
        .query({ q })
        .set("Cookie", ownerCookie);
      expect(response.body.items.map((customer: { fullName: string }) => customer.fullName)).toEqual([
        "Hélène Lefèvre",
      ]);
    }
  });

  it("clears the emails about an erased Customer, and nothing of the same address at another Location", async () => {
    const prisma = app.get(PrismaService);
    const email = `delivered+erased-log-${Date.now()}@resend.dev`;
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Erased log", customer: { fullName: "Erased Log", email } });
    const ticketId = BigInt(created.body.id);
    const about = { subject: "Erased Log", html: "<p>Erased Log</p>", ticketId };
    const toCustomer = await prisma.emailLog.create({
      data: {
        ...about,
        to: email,
        type: "ticket_status_update",
        lastEvent: { data: { to: [email] } },
        attachments: [{ filename: "ready-date.ics", content: "QkVHSU4=", contentType: "text/calendar" }],
      },
    });
    const staffCopy = await prisma.emailLog.create({
      data: { ...about, to: "delivered+staff@resend.dev", type: "feedback_received" },
    });
    const elsewhere = await prisma.emailLog.create({
      data: { to: email, subject: "Another Location", html: "<p>Kept</p>", type: "ticket_status_update" },
    });

    await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${created.body.customer.id}`)
      .set("Cookie", ownerCookie)
      .expect(204);

    for (const { id } of [toCustomer, staffCopy]) {
      const after = await prisma.emailLog.findUniqueOrThrow({ where: { id } });
      expect(after).toMatchObject({
        to: "erased@deleted.invalid",
        subject: "[deleted]",
        html: null,
        text: null,
        lastEvent: null,
        attachments: null,
      });
      expect(after.gaveUpAt).toBeTruthy();
    }
    await expect(prisma.emailLog.findUniqueOrThrow({ where: { id: elsewhere.id } })).resolves.toMatchObject({
      to: email,
      html: "<p>Kept</p>",
      gaveUpAt: null,
    });
    await prisma.emailLog.delete({ where: { id: elsewhere.id } });
  });

  it("writes no email about a Customer once they're erased, and sends none from an old list", async () => {
    const prisma = app.get(PrismaService);
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Erased race", customer: { fullName: "Erased Race" } });
    const ticketId = BigInt(created.body.id);
    const stale = await prisma.emailLog.create({
      data: {
        to: "delivered+staff@resend.dev",
        subject: "Erased Race",
        html: "<p>x</p>",
        type: "feedback_received",
        ticketId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/locations/${locationId}/customers/${created.body.customer.id}`)
      .set("Cookie", ownerCookie)
      .expect(204);

    const email = app.get(EmailService);
    await expect(email.retry(stale)).resolves.toBeNull();
    await expect(
      email.send({
        to: "delivered+staff@resend.dev",
        subject: "Late",
        html: "<p>Late</p>",
        type: "feedback_received",
        ticketId,
      }),
    ).resolves.toBeNull();
    await expect(prisma.emailLog.count({ where: { ticketId, subject: "Late" } })).resolves.toBe(0);
    await expect(prisma.emailLog.findUniqueOrThrow({ where: { id: stale.id } })).resolves.toMatchObject({
      attempts: 0,
    });
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

  it("refuses a null name with a 400, but lets null clear the email", async () => {
    const path = `/locations/${locationId}/customers/${bobId}`;

    const name = await request(app.getHttpServer()).patch(path).set("Cookie", ownerCookie).send({ fullName: null });
    expect(name.status).toBe(400);
    expect(name.body.error.details[0].property).toBe("fullName");

    const email = await request(app.getHttpServer()).patch(path).set("Cookie", ownerCookie).send({ email: null });
    expect(email.status).toBe(200);
    expect(email.body.email).toBeNull();
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

  it("finds a customer by part of their email or phone, however the number is written", async () => {
    const path = `/locations/${locationId}/customers`;
    const found = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({
        title: "Found by contact",
        customer: { fullName: "Dana Contact", email: "delivered+dana-lookup@resend.dev", phone: "+32471318944" },
      });
    expect(found.status).toBe(201);

    for (const q of ["dana-lookup", "+32471318944", "0471 31 89 44", "471318"]) {
      const response = await request(app.getHttpServer()).get(path).query({ q }).set("Cookie", ownerCookie);
      expect(response.status).toBe(200);
      expect(response.body.items.map((customer: { fullName: string }) => customer.fullName)).toEqual(["Dana Contact"]);
    }
  });

  it("pages through customers by name, each one exactly once", async () => {
    const names: string[] = [];
    let total: number;
    let page = 1;
    do {
      const response: request.Response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/customers`)
        .query({ take: 1, page })
        .set("Cookie", ownerCookie);
      expect(response.status).toBe(200);
      names.push(...response.body.items.map((customer: { fullName: string }) => customer.fullName));
      total = response.body.total;
      page += 1;
    } while (names.length < total);

    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(["not-a-page", "0", "100001"])("rejects the page %s", async (page) => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ page })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("never finds another location's customer, by name or by contact", async () => {
    const other = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", otherCookie)
      .send({
        termsVersion: TERMS_VERSION,
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
    await createTicketWithCustomer(app, otherCookie, other.body.locations[0].id, "Carol Foreign");

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/customers`)
      .query({ q: "Carol Foreign" })
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
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
