// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// Customer addresses are Resend's test addresses: real sends through the
// real API, accepted but never delivered, so no bounce hurts the sending
// domain's reputation. The +label keeps each test's emails findable.
describe("Ticket tracking link emails", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+notif-${stamp}-${label}@resend.dev`;

  async function createTicket(body: object) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Brake pads", ...body });
    return response.body as { id: string; trackingCode: string; customer: { id: string } };
  }

  function resendLink(ticketId: string) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticketId}/resend-link`)
      .set("Cookie", ownerCookie);
  }

  function emailsTo(to: string) {
    return prisma.emailLog.findMany({ where: { to }, orderBy: { createdAt: "asc" } });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+notif-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Notification Test Garage",
        location: {
          name: "Garage Lumière",
          businessTypeCode: "GARAGE",
          contactPhone: "+32470123456",
          contactEmail: "atelier@lumiere.test",
          locale: "FR",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("on ticket creation", () => {
    it("emails the customer their tracking link, as the shop, in the shop's language", async () => {
      const ticket = await createTicket({ customer: { fullName: "Chloé Dubois", email: address("fr") } });

      const [email] = await emailsTo(address("fr"));
      expect(email).toMatchObject({
        type: "ticket_tracking_link",
        status: "SENT",
        subject: "Votre réparation chez Garage Lumière est enregistrée",
        fromName: "Garage Lumière via ReadyYet",
        replyTo: "atelier@lumiere.test",
      });
      expect(email.html).toContain(`${process.env.WEB_URL}/t/${ticket.trackingCode}`);
      expect(email.html).toContain(`${process.env.WEB_URL}/t/${ticket.trackingCode}/stop-updates`);
      expect(email.text).toContain("Chloé Dubois");
    });

    it("uses the customer's own language when staff set one", async () => {
      await createTicket({ customer: { fullName: "Sam Baker", email: address("en"), locale: "EN" } });

      const [email] = await emailsTo(address("en"));
      expect(email.subject).toBe("Your repair at Garage Lumière is registered");
    });

    it("also emails an existing customer picked for a new ticket", async () => {
      const first = await createTicket({ customer: { fullName: "Returning Customer", email: address("returning") } });
      await createTicket({ title: "Oil change", customerId: first.customer.id });

      expect(await emailsTo(address("returning"))).toHaveLength(2);
    });

    it("sends nothing to a customer without an email address", async () => {
      const ticket = await createTicket({ customer: { fullName: "No Email" } });

      const sent = await prisma.emailLog.count({ where: { html: { contains: ticket.trackingCode } } });
      expect(sent).toBe(0);
    });
  });

  describe("resending the tracking link", () => {
    it("emails the link again and says where it went", async () => {
      const ticket = await createTicket({ customer: { fullName: "Lost Email", email: address("resend") } });

      const response = await resendLink(ticket.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ sentTo: address("resend") });
      const emails = await emailsTo(address("resend"));
      expect(emails).toHaveLength(2);
      expect(emails[1].html).toContain(`/t/${ticket.trackingCode}`);
    });

    it("sends to the customer's current address, e.g. one added after drop-off", async () => {
      const ticket = await createTicket({ customer: { fullName: "Added Later" } });
      await request(app.getHttpServer())
        .patch(`/locations/${locationId}/customers/${ticket.customer.id}`)
        .set("Cookie", ownerCookie)
        .send({ email: address("added-later") });

      expect((await resendLink(ticket.id)).status).toBe(200);
      expect(await emailsTo(address("added-later"))).toHaveLength(1);
    });

    it("refuses when the customer has no email address", async () => {
      const ticket = await createTicket({ customer: { fullName: "Still No Email" } });

      const response = await resendLink(ticket.id);

      expect(response.status).toBe(409);
    });

    it("refuses once the tracking link has expired, instead of sending a dead link", async () => {
      const ticket = await createTicket({ customer: { fullName: "Long Gone", email: address("expired") } });
      await request(app.getHttpServer())
        .patch(`/locations/${locationId}/tickets/${ticket.id}/status`)
        .set("Cookie", ownerCookie)
        .send({ statusCode: "CANCELLED" });
      // The whole history, so it stays in order: cancelled 31 days ago.
      await prisma.$executeRaw`
        UPDATE ticket_status_event SET created_at = created_at - interval '31 days'
        WHERE ticket_id = ${BigInt(ticket.id)}`;

      const response = await resendLink(ticket.id);

      expect(response.status).toBe(409);
      expect(await emailsTo(address("expired"))).toHaveLength(1);
    });

    it("returns 404 for a ticket that isn't in this location", async () => {
      expect((await resendLink("999999999")).status).toBe(404);
    });
  });
});
