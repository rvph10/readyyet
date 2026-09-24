// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { NotificationService } from "../src/notification/notification.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0015: the per-ticket "stop updates" link, also offered by mail
// clients through List-Unsubscribe.
describe("Stopping a ticket's status updates", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notification: NotificationService;
  let ownerCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+stop-${stamp}-${label}@resend.dev`;

  async function createTicket(label: string) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Bottes", customer: { fullName: "Chloé Dubois", email: address(label) } });
    return response.body as { id: string; trackingCode: string };
  }

  function setStatus(ticketId: string, statusCode: string) {
    return request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
  }

  // The request a mail client's own unsubscribe button sends (RFC 8058):
  // no cookie, a form body.
  function stop(trackingCode: string) {
    return request(app.getHttpServer())
      .post(`/tracking/${trackingCode}/stop-notifications`)
      .type("form")
      .send("List-Unsubscribe=One-Click");
  }

  async function makeDueAndSweep(ticketId: string) {
    await prisma.pendingStatusNotification.updateMany({
      where: { statusEvent: { ticketId: BigInt(ticketId) } },
      data: { sendAfter: new Date(Date.now() - 1000) },
    });
    await notification.sendDueStatusEmails();
  }

  function emailsTo(label: string, type: string) {
    return prisma.emailLog.findMany({ where: { to: address(label), type } });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+stop-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Stop Updates Test",
        location: {
          name: "Cordonnerie Lumière",
          businessTypeCode: "SHOE_REPAIR",
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

  it("offers mail clients a one-click stop in every customer email", async () => {
    const ticket = await createTicket("headers");

    const [email] = await emailsTo("headers", "ticket_tracking_link");
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${process.env.BETTER_AUTH_URL}/tracking/${ticket.trackingCode}/stop-notifications>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("stops without a login and shows staff when it happened", async () => {
    const ticket = await createTicket("stopped");

    expect((await stop(ticket.trackingCode)).status).toBe(204);

    const detail = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${ticket.id}`)
      .set("Cookie", ownerCookie);
    expect(detail.body.notificationsStoppedAt).toEqual(expect.any(String));
  });

  it("keeps the first stop time when the link is used again", async () => {
    const ticket = await createTicket("twice");
    await stop(ticket.trackingCode);
    const first = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticket.id) } });

    expect((await stop(ticket.trackingCode)).status).toBe(204);

    const second = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticket.id) } });
    expect(second.notificationsStoppedAt).toEqual(first.notificationsStoppedAt);
  });

  it("drops a status email already waiting, and sends none after", async () => {
    const ticket = await createTicket("queued");
    await setStatus(ticket.id, "AWAITING_APPROVAL");
    await stop(ticket.trackingCode);

    await makeDueAndSweep(ticket.id);
    await setStatus(ticket.id, "READY");
    await makeDueAndSweep(ticket.id);

    expect(await emailsTo("queued", "ticket_status_update")).toHaveLength(0);
    expect(
      await prisma.pendingStatusNotification.count({ where: { statusEvent: { ticketId: BigInt(ticket.id) } } }),
    ).toBe(0);
  });

  it("still lets staff resend the tracking link", async () => {
    const ticket = await createTicket("resend");
    await stop(ticket.trackingCode);

    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticket.id}/resend-link`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(await emailsTo("resend", "ticket_tracking_link")).toHaveLength(2);
  });

  it("answers 404 for an unknown or expired link, like the tracking page", async () => {
    expect((await stop("no-such-code")).status).toBe(404);

    const ticket = await createTicket("expired");
    await setStatus(ticket.id, "CANCELLED");
    await prisma.$executeRaw`
      UPDATE ticket_status_event SET created_at = created_at - interval '31 days'
      WHERE ticket_id = ${BigInt(ticket.id)}`;

    expect((await stop(ticket.trackingCode)).status).toBe(404);
  });
});
