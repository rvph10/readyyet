// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { NotificationService } from "../src/notification/notification.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0015: a notifying status queues an email that's only sent once the
// undo window has passed, and only if the ticket is still at that status.
// Tests make queued emails due by moving sendAfter into the past, then run
// the sweep directly instead of waiting for its cron.
describe("Customer status emails", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notification: NotificationService;
  let ownerCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+status-${stamp}-${label}@resend.dev`;

  async function createTicket(label: string | null) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({
        title: "Veste en cuir",
        customer: { fullName: "Chloé Dubois", ...(label && { email: address(label) }) },
      });
    return response.body as { id: string };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
    expect(response.status).toBe(200);
  }

  function pendingFor(ticketId: string) {
    return prisma.pendingStatusNotification.findMany({
      where: { statusEvent: { ticketId: BigInt(ticketId) } },
      include: { statusEvent: { include: { status: true } } },
    });
  }

  async function makeDueAndSweep(ticketId: string) {
    await prisma.pendingStatusNotification.updateMany({
      where: { statusEvent: { ticketId: BigInt(ticketId) } },
      data: { sendAfter: new Date(Date.now() - 1000) },
    });
    await notification.sendDueStatusEmails();
  }

  function statusEmailsTo(label: string) {
    return prisma.emailLog.findMany({
      where: { to: address(label), type: "ticket_status_update" },
      orderBy: { createdAt: "asc" },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+status-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Status Email Test",
        location: {
          name: "Maroquinerie Lumière",
          businessTypeCode: "LEATHER_GOODS",
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

  it("sweeps for due emails every 30 seconds", () => {
    const job = app.get(SchedulerRegistry).getCronJob("customer-status-emails");

    expect(job.cronTime.source).toBe("*/30 * * * * *");
  });

  it("queues a notifying status for after the undo window, without sending it yet", async () => {
    const ticket = await createTicket("queued");
    const before = Date.now();
    await setStatus(ticket.id, "READY");

    const [pending] = await pendingFor(ticket.id);
    expect(pending.statusEvent.status.code).toBe("READY");
    const delay = pending.sendAfter.getTime() - before;
    expect(delay).toBeGreaterThanOrEqual(130_000);
    expect(delay).toBeLessThan(135_000);

    await notification.sendDueStatusEmails();
    expect(await statusEmailsTo("queued")).toHaveLength(0);
  });

  it("queues nothing for a status that doesn't email the customer", async () => {
    const ticket = await createTicket("silent");
    await setStatus(ticket.id, "DIAGNOSING");
    await setStatus(ticket.id, "REPAIRING");

    expect(await pendingFor(ticket.id)).toHaveLength(0);
  });

  it("sends the email once due, as the shop, then forgets it", async () => {
    const ticket = await createTicket("ready");
    await setStatus(ticket.id, "READY");

    await makeDueAndSweep(ticket.id);

    const [email] = await statusEmailsTo("ready");
    expect(email).toMatchObject({
      status: "SENT",
      subject: "Votre réparation chez Maroquinerie Lumière est prête",
      fromName: "Maroquinerie Lumière via ReadyYet",
      replyTo: "atelier@lumiere.test",
    });
    expect(await pendingFor(ticket.id)).toHaveLength(0);

    await notification.sendDueStatusEmails();
    expect(await statusEmailsTo("ready")).toHaveLength(1);
  });

  it.each([
    ["CANCELLED", "Votre réparation chez Maroquinerie Lumière a été annulée"],
    ["REJECTED", "Votre réparation chez Maroquinerie Lumière n'a pas pu être traitée"],
  ])("sends the %s email", async (status, subject) => {
    const label = status.toLowerCase();
    const ticket = await createTicket(label);
    await setStatus(ticket.id, status);

    await makeDueAndSweep(ticket.id);

    const [email] = await statusEmailsTo(label);
    expect(email.subject).toBe(subject);
  });

  it("never sends an undone change", async () => {
    const ticket = await createTicket("undone");
    await setStatus(ticket.id, "READY");
    await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticket.id}/status/undo`)
      .set("Cookie", ownerCookie);

    expect(await pendingFor(ticket.id)).toHaveLength(0);
    await makeDueAndSweep(ticket.id);
    expect(await statusEmailsTo("undone")).toHaveLength(0);
  });

  it("drops an email the ticket has moved past, sending only where it stands now", async () => {
    const ticket = await createTicket("superseded");
    await setStatus(ticket.id, "READY");
    await setStatus(ticket.id, "CANCELLED");

    await makeDueAndSweep(ticket.id);

    const emails = await statusEmailsTo("superseded");
    expect(emails.map((email) => email.subject)).toEqual(["Votre réparation chez Maroquinerie Lumière a été annulée"]);
    expect(await pendingFor(ticket.id)).toHaveLength(0);
  });

  it("drops an email once the ticket moved to a status that sends nothing", async () => {
    const ticket = await createTicket("back-to-work");
    await setStatus(ticket.id, "READY");
    await setStatus(ticket.id, "REPAIRING");

    await makeDueAndSweep(ticket.id);

    expect(await statusEmailsTo("back-to-work")).toHaveLength(0);
  });

  it("sends a due email once even when two sweeps run at the same time", async () => {
    const ticket = await createTicket("concurrent");
    await setStatus(ticket.id, "READY");
    await prisma.pendingStatusNotification.updateMany({
      where: { statusEvent: { ticketId: BigInt(ticket.id) } },
      data: { sendAfter: new Date(Date.now() - 1000) },
    });

    await Promise.all([notification.sendDueStatusEmails(), notification.sendDueStatusEmails()]);

    expect(await statusEmailsTo("concurrent")).toHaveLength(1);
  });

  it("sends to an email address added while the change was waiting", async () => {
    const ticket = (
      await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie)
        .send({ title: "Sac", customer: { fullName: "Added Later" } })
    ).body as { id: string; customer: { id: string } };
    await setStatus(ticket.id, "READY");
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}/customers/${ticket.customer.id}`)
      .set("Cookie", ownerCookie)
      .send({ email: address("added-later") });

    await makeDueAndSweep(ticket.id);

    expect(await statusEmailsTo("added-later")).toHaveLength(1);
  });

  it("sends nothing to an address that bounced, and forgets the queued email", async () => {
    const ticket = await createTicket("bounced");
    await setStatus(ticket.id, "READY");
    await prisma.customer.updateMany({
      where: { tickets: { some: { id: BigInt(ticket.id) } } },
      data: { emailBouncedAt: new Date() },
    });

    await makeDueAndSweep(ticket.id);

    expect(await statusEmailsTo("bounced")).toHaveLength(0);
    expect(await pendingFor(ticket.id)).toHaveLength(0);
  });

  it("sends nothing to a customer without an email address, and forgets the queued email", async () => {
    const ticket = await createTicket(null);
    await setStatus(ticket.id, "READY");

    await makeDueAndSweep(ticket.id);

    expect(await pendingFor(ticket.id)).toHaveLength(0);
  });
});
