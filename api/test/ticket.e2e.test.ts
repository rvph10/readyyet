// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { EmailStatus } from "@readyyet/db";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";
import { TERMS_VERSION } from "@readyyet/shared";

describe("Tickets", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+ticket-owner-${stamp}@resend.dev`);
    otherCookie = await signInViaOtp(app, prisma, `delivered+ticket-other-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        termsVersion: TERMS_VERSION,
        name: "Ticket Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550123",
          contactEmail: "shop@tickettest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a ticket with an inline customer, starting at RECEIVED", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({
        title: "Brake inspection",
        customer: { fullName: "Alice Driver", email: "delivered+alice@resend.dev" },
      });

    expect(response.status).toBe(201);
    expect(response.body.trackingCode).toMatch(/^[\w-]{12}$/);
    expect(response.body.currentStatus.code).toBe("RECEIVED");
    expect(response.body.customer.fullName).toBe("Alice Driver");
  });

  it("creates a second ticket reusing the first ticket's customerId", async () => {
    const first = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Oil change", customer: { fullName: "Bob Returner" } });
    const customerId = first.body.customer.id;

    const second = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Tire rotation", customerId });

    expect(second.status).toBe(201);
    expect(second.body.customer.id).toBe(customerId);
    expect(second.body.customer.fullName).toBe("Bob Returner");
  });

  it("rejects a request with both customer and customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid", customer: { fullName: "X" }, customerId: "1" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a title or customer name past its length limit, naming the field", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "t".repeat(201), customer: { fullName: "n".repeat(101) } });

    expect(response.status).toBe(400);
    expect(response.body.error.details.map((issue: { property: string }) => issue.property)).toEqual([
      "title",
      "customer.fullName",
    ]);
  });

  it("rejects a request with neither customer nor customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown customerId", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid", customerId: "999999999" });

    expect(response.status).toBe(404);
  });

  it.each(["1.5", "99999999999999999999"])("rejects the customerId %s, not a bigint", async (customerId) => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Invalid", customerId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists tickets for the location, newest first", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThanOrEqual(3);
    const createdAts = response.body.items.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    expect(createdAts).toEqual([...createdAts].sort((a, b) => b - a));
  });

  it("gets a ticket's detail with its status timeline", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Detail check", customer: { fullName: "Carol Detail" } });

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.statusEvents).toHaveLength(1);
    expect(response.body.statusEvents[0].status.code).toBe("RECEIVED");
    expect(response.body.statusEvents[0].changedByName).toEqual(expect.any(String));
    expect(response.body.trackingUrl).toBe(`${process.env.WEB_URL}/t/${created.body.trackingCode}`);
    expect(response.body.trackingLinkExpired).toBe(false);
    expect(response.body.steps[0].status.code).toBe("RECEIVED");
    expect(response.body.emailProblem).toBeNull();
  });

  describe("emailProblem", () => {
    const address = "delivered+email-problem@resend.dev";
    let ticketId: string;

    const problem = async () =>
      (
        await request(app.getHttpServer())
          .get(`/locations/${locationId}/tickets/${ticketId}`)
          .set("Cookie", ownerCookie)
      ).body.emailProblem as string | null;

    // Ahead of the clock, as the Ticket's own tracking email can still be
    // written by its sweep during the test.
    const latestEmail = (data: { status: EmailStatus; type?: string; to?: string; gaveUpAt?: Date }) =>
      prisma.emailLog.create({
        data: {
          to: address,
          subject: "Problem test",
          type: "ticket_tracking_link",
          createdAt: new Date(Date.now() + 60 * 60_000 + Math.random() * 60_000),
          ticketId: BigInt(ticketId),
          ...data,
        },
      });

    beforeEach(async () => {
      const created = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie)
        .send({ title: "Email problem", customer: { fullName: "Dana Problem", email: address } });
      ticketId = created.body.id;
    });

    it("says an email that failed is being retried", async () => {
      await latestEmail({ status: EmailStatus.FAILED });
      expect(await problem()).toBe("RETRYING");
    });

    it("says an email was given up on", async () => {
      await latestEmail({ status: EmailStatus.FAILED, gaveUpAt: new Date() });
      expect(await problem()).toBe("GAVE_UP");
    });

    it("says a temporarily bounced email was given up on, as nothing retries it", async () => {
      await latestEmail({ status: EmailStatus.BOUNCED });
      expect(await problem()).toBe("GAVE_UP");
    });

    it("leaves a permanent bounce to the Customer's own flag", async () => {
      await latestEmail({ status: EmailStatus.BOUNCED });
      const { body } = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets/${ticketId}`)
        .set("Cookie", ownerCookie);
      await prisma.customer.update({
        where: { id: BigInt((body as { customer: { id: string } }).customer.id) },
        data: { emailBouncedAt: new Date() },
      });
      expect(await problem()).toBeNull();
    });

    it("says nothing once the Customer's address has changed, that email is no longer wanted", async () => {
      await latestEmail({ status: EmailStatus.FAILED, to: "delivered+old@resend.dev", gaveUpAt: new Date() });
      expect(await problem()).toBeNull();
    });

    it("says nothing when a later email was sent", async () => {
      const failed = await latestEmail({ status: EmailStatus.FAILED });
      await prisma.emailLog.create({
        data: {
          to: address,
          subject: "Later",
          type: "ticket_tracking_link",
          status: EmailStatus.SENT,
          ticketId: BigInt(ticketId),
          createdAt: new Date(failed.createdAt.getTime() + 60_000),
        },
      });
      expect(await problem()).toBeNull();
    });

    it("ignores a staff copy of the Customer's feedback", async () => {
      await latestEmail({ status: EmailStatus.FAILED, type: "feedback_received", to: "staff@shop.test" });
      expect(await problem()).toBeNull();
    });
  });

  it("returns only the documented fields, no internal columns", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Shape check", customer: { fullName: "Dana Shape", email: "delivered+shape@resend.dev" } });

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);
    const status = { id: expect.any(Number), code: "RECEIVED", translations: expect.any(Array) };

    expect(Object.keys(response.body.customer).sort()).toEqual([
      "createdAt",
      "email",
      "emailBouncedAt",
      "emailComplainedAt",
      "fullName",
      "id",
      "locale",
      "phone",
    ]);
    expect(response.body.currentStatus).toEqual(status);
    expect(Object.keys(response.body.currentStatus.translations[0]).sort()).toEqual(["label", "locale"]);
    expect(response.body.statusEvents[0].status).toEqual(status);
  });

  it("updates a ticket's title and description", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Initial title", customer: { fullName: "Grace Edit" } });

    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie)
      .send({ title: "Brake pads worn", description: "Front pads at 2mm, needs replacement" });

    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Brake pads worn");
    expect(patched.body.description).toBe("Front pads at 2mm, needs replacement");

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);
    expect(detail.body.title).toBe("Brake pads worn");
  });

  it("refuses a null title with a 400, a ticket always has one", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Initial title", customer: { fullName: "Hal Null" } });

    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie)
      .send({ title: null });

    expect(patched.status).toBe(400);
    expect(patched.body.error.details[0].property).toBe("title");
  });

  it("rejects a non-member updating a ticket", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Should not edit", customer: { fullName: "Henry Block" } });

    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", otherCookie)
      .send({ title: "Hacked" });

    expect(response.status).toBe(403);
  });

  it("moves a ticket to a real step of its workflow", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Status change", customer: { fullName: "Dave Status" } });

    const patched = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "DIAGNOSING" });

    expect(patched.status).toBe(200);
    expect(patched.body.currentStatus.code).toBe("DIAGNOSING");

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${created.body.id}`)
      .set("Cookie", ownerCookie);

    expect(detail.body.statusEvents).toHaveLength(2);
  });

  it("rejects a status code that isn't a step of this ticket's workflow", async () => {
    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Bad status", customer: { fullName: "Eve Bad" } });

    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${created.body.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "STAIN_TREATMENT" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const create = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", otherCookie)
      .send({ title: "Should fail", customer: { fullName: "Frank Fail" } });
    expect(create.status).toBe(403);

    const list = await request(app.getHttpServer()).get(`/locations/${locationId}/tickets`).set("Cookie", otherCookie);
    expect(list.status).toBe(403);
  });

  it.each(["not-a-number", "99999999999999999999"])(
    "returns 404, not a raw DB error, for the ticket id %s",
    async (ticketId) => {
      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets/${ticketId}`)
        .set("Cookie", ownerCookie);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    },
  );
});
