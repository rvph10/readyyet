// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";
import { NotificationService } from "../src/notification/notification.service";
import { EmailRetryService } from "../src/email/email-retry.service";
import { EmailService } from "../src/email/email.service";

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
    await app.get(NotificationService).sendDueTicketCreatedEmails();
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
          timeZone: "Europe/Brussels",
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
    it("saves the email as due with the Ticket, and sends it from the sweep rather than the request", async () => {
      const response = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie)
        .send({ title: "Brake pads", customer: { fullName: "Due Soon", email: address("due") } });

      const saved = await prisma.ticket.findUniqueOrThrow({
        where: { id: BigInt((response.body as { id: string }).id) },
      });
      expect(saved.trackingEmailDueAt).toBeTruthy();
      expect(await emailsTo(address("due"))).toHaveLength(0);

      await app.get(NotificationService).sendDueTicketCreatedEmails();

      expect(await emailsTo(address("due"))).toHaveLength(1);
      const sent = await prisma.ticket.findUniqueOrThrow({ where: { id: saved.id } });
      expect(sent.trackingEmailDueAt).toBeNull();
    });

    it("sends it once when two sweeps run at the same time", async () => {
      const response = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie)
        .send({ title: "Brake pads", customer: { fullName: "Two Sweeps", email: address("twice") } });
      expect(response.status).toBe(201);

      const notification = app.get(NotificationService);
      await Promise.all([notification.sendDueTicketCreatedEmails(), notification.sendDueTicketCreatedEmails()]);

      expect(await emailsTo(address("twice"))).toHaveLength(1);
    });

    it("keeps the email due, on a lease, when sending it throws, and the other Tickets still go out", async () => {
      const send = async (label: string) =>
        (
          await request(app.getHttpServer())
            .post(`/locations/${locationId}/tickets`)
            .set("Cookie", ownerCookie)
            .send({ title: "Brake pads", customer: { fullName: label, email: address(label) } })
        ).body as { id: string };
      const failing = await send("throws");
      await send("after-throw");
      const email = app.get(EmailService);
      const spy = vi.spyOn(email, "send").mockRejectedValueOnce(new Error("simulated render failure"));

      await app.get(NotificationService).sendDueTicketCreatedEmails();
      spy.mockRestore();

      const kept = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(failing.id) } });
      expect(kept.trackingEmailDueAt!.getTime()).toBeGreaterThan(Date.now());
      expect(await emailsTo(address("after-throw"))).toHaveLength(1);
    });

    it("doesn't send a second email when a retry follows a crash after the first", async () => {
      const ticket = await createTicket({ customer: { fullName: "Crash After", email: address("crash") } });
      await prisma.ticket.update({ where: { id: BigInt(ticket.id) }, data: { trackingEmailDueAt: new Date() } });

      await app.get(NotificationService).sendDueTicketCreatedEmails();

      expect(await emailsTo(address("crash"))).toHaveLength(1);
      const after = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticket.id) } });
      expect(after.trackingEmailDueAt).toBeNull();
    });

    it("drops the email of a Ticket over a day old instead of telling the Customer we just got their item", async () => {
      const response = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie)
        .send({ title: "Brake pads", customer: { fullName: "Too Late", email: address("late") } });
      const id = BigInt((response.body as { id: string }).id);
      await prisma.ticket.update({ where: { id }, data: { createdAt: new Date(Date.now() - 25 * 60 * 60_000) } });

      await app.get(NotificationService).sendDueTicketCreatedEmails();

      expect(await emailsTo(address("late"))).toHaveLength(0);
      expect((await prisma.ticket.findUniqueOrThrow({ where: { id } })).trackingEmailDueAt).toBeNull();
    });

    describe("a late retry", () => {
      async function failedEmailOf(label: string) {
        const ticket = await createTicket({ customer: { fullName: "Late Retry", email: address(label) } });
        const [email] = await emailsTo(address(label));
        await prisma.emailLog.update({
          where: { id: email.id },
          data: { status: "FAILED", resendId: null, attempts: 3, lastAttemptAt: new Date(Date.now() - 60 * 60_000) },
        });
        return { ticket, email };
      }

      it("isn't sent to an address staff have since corrected", async () => {
        const { ticket, email } = await failedEmailOf("corrected");
        await prisma.customer.update({
          where: { id_locationId: { id: BigInt(ticket.customer.id), locationId } },
          data: { email: address("corrected-new") },
        });

        await app.get(EmailRetryService).sweep();

        const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } });
        expect(after.gaveUpAt).toBeTruthy();
        expect(after.attempts).toBe(3);
      });

      it("doesn't remind a Customer of an item no longer waiting at READY", async () => {
        const { email } = await failedEmailOf("reminder-moved-on");
        await prisma.emailLog.update({ where: { id: email.id }, data: { type: "ticket_ready_reminder" } });

        await app.get(EmailRetryService).sweep();

        const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } });
        expect(after.gaveUpAt).toBeTruthy();
        expect(after.attempts).toBe(3);
      });

      it("drops a ready date email a later one has replaced, so the old date can't land last", async () => {
        const { ticket, email } = await failedEmailOf("date-replaced");
        await prisma.emailLog.update({ where: { id: email.id }, data: { type: "ticket_ready_date_changed" } });
        await prisma.emailLog.create({
          data: {
            to: address("date-replaced"),
            subject: "A later date",
            type: "ticket_ready_date_changed",
            status: "SENT",
            ticketId: BigInt(ticket.id),
          },
        });

        await app.get(EmailRetryService).sweep();

        const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } });
        expect(after.gaveUpAt).toBeTruthy();
        expect(after.attempts).toBe(3);
      });

      it("still sends the latest ready date email", async () => {
        const { email } = await failedEmailOf("date-latest");
        await prisma.emailLog.update({ where: { id: email.id }, data: { type: "ticket_ready_date_changed" } });

        await app.get(EmailRetryService).sweep();

        const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } });
        expect(after.status).toBe("SENT");
        expect(after.gaveUpAt).toBeNull();
      });

      it("still sends staff their copy of feedback, which doesn't go to the Customer's address", async () => {
        const { ticket } = await failedEmailOf("staff-copy");
        const email = await prisma.emailLog.create({
          data: {
            to: address("staff-copy-owner"),
            subject: "New feedback",
            html: "<p>New feedback</p>",
            type: "feedback_received",
            ticketId: BigInt(ticket.id),
            status: "FAILED",
            attempts: 3,
            lastAttemptAt: new Date(Date.now() - 60 * 60_000),
          },
        });

        await app.get(EmailRetryService).sweep();

        const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } });
        expect(after.status).toBe("SENT");
        expect(after.gaveUpAt).toBeNull();
      });

      it("isn't sent to an erased Customer", async () => {
        const { ticket, email } = await failedEmailOf("erased");
        await prisma.customer.update({
          where: { id_locationId: { id: BigInt(ticket.customer.id), locationId } },
          data: { email: null, deletedAt: new Date() },
        });

        await app.get(EmailRetryService).sweep();

        expect((await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } })).attempts).toBe(3);
      });

      it("still goes out when nothing has changed", async () => {
        const { email } = await failedEmailOf("unchanged");

        await app.get(EmailRetryService).sweep();

        expect((await prisma.emailLog.findUniqueOrThrow({ where: { id: email.id } })).status).toBe("SENT");
      });
    });

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

  describe("to an address that fails", () => {
    async function flaggedCustomer(label: string, flag: "emailBouncedAt" | "emailComplainedAt") {
      const ticket = await createTicket({ customer: { fullName: "Typo Customer", email: address(label) } });
      await prisma.customer.update({ where: { id: BigInt(ticket.customer.id) }, data: { [flag]: new Date() } });
      return ticket;
    }

    it.each(["emailBouncedAt", "emailComplainedAt"] as const)(
      "sends nothing more once %s is set, not even for a new ticket",
      async (flag) => {
        const first = await flaggedCustomer(`flagged-${flag}`, flag);

        await createTicket({ title: "Second job", customerId: first.customer.id });

        expect(await emailsTo(address(`flagged-${flag}`))).toHaveLength(1);
      },
    );
  });
});
