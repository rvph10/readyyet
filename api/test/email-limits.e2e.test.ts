// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { TERMS_VERSION } from "@readyyet/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { trialSubscription } from "../src/billing/plans";
import { PrismaService } from "../src/database/prisma.service";
import { DAILY_CUSTOMER_EMAILS, SIGN_IN_CODES_PER_HOUR } from "../src/email/email-limits";
import { EmailService } from "../src/email/email.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0140.
describe("Email limits", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let email: EmailService;
  let ownerCookie: string;
  const stamp = Date.now();
  const to = `delivered+limits-${stamp}@resend.dev`;

  async function createTicket() {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        termsVersion: TERMS_VERSION,
        name: "Limits",
        location: {
          name: "Limits",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@limits.test",
          locale: "FR",
        },
      });
    const locationId = created.body.locations[0].id as string;
    await prisma.subscription.update({ where: { locationId }, data: trialSubscription() });
    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Portière", customer: { fullName: "Chloé Dubois" } });
    // Given after creating, so no tracking email goes out.
    await prisma.customer.update({ where: { id: BigInt(ticket.body.customer.id as string) }, data: { email: to } });
    return { locationId, ticketId: BigInt(ticket.body.id as string) };
  }

  const statusEmail = (ticketId: bigint) =>
    email.send({
      to,
      subject: "Status",
      type: "ticket_status_update",
      html: "<p>Status</p>",
      ticketId,
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    email = app.get(EmailService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+limits-owner-${stamp}@resend.dev`);
  });

  afterAll(async () => {
    await app.close();
  });

  it("holds back a Location's Customer emails past its daily limit, and says so", async () => {
    const { locationId, ticketId } = await createTicket();
    await prisma.emailLog.createMany({
      data: Array.from({ length: DAILY_CUSTOMER_EMAILS.trial - 1 }, () => ({
        to: "delivered@resend.dev",
        subject: "Earlier",
        type: "ticket_status_update",
        status: "DELIVERED" as const,
        ticketId,
      })),
    });

    const last = await statusEmail(ticketId);
    const over = await statusEmail(ticketId);

    expect(last?.status).toBe("SENT");
    expect(over).toMatchObject({ status: "LIMITED", resendId: null });
    expect(over?.gaveUpAt).toBeTruthy();
    const ticket = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/${ticketId}`)
      .set("Cookie", ownerCookie);
    expect(ticket.body.emailProblem).toBe("LIMITED");
    const overview = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/overview`)
      .set("Cookie", ownerCookie);
    expect(overview.body.customerEmailsLimited).toBe(true);
  });

  it("counts only today's emails to Customers", async () => {
    const { locationId, ticketId } = await createTicket();
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.emailLog.createMany({
      data: Array.from({ length: DAILY_CUSTOMER_EMAILS.trial }, (_, index) => ({
        to: "delivered@resend.dev",
        subject: "Other",
        // Staff copies don't count, nor what was sent before today.
        type: index % 2 ? "feedback_received" : "ticket_status_update",
        status: "DELIVERED" as const,
        ticketId,
        createdAt: index % 2 ? new Date() : yesterday,
      })),
    });

    expect((await statusEmail(ticketId))?.status).toBe("SENT");
    const overview = await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/overview`)
      .set("Cookie", ownerCookie);
    expect(overview.body.customerEmailsLimited).toBe(false);
  });

  it("sends an address no more sign-in codes than the hourly limit", async () => {
    const address = `delivered+limits-codes-${stamp}@resend.dev`;
    for (let i = 0; i < SIGN_IN_CODES_PER_HOUR + 2; i++) {
      await request(app.getHttpServer())
        .post("/api/auth/email-otp/send-verification-otp")
        .set("X-Real-IP", `198.19.0.${i + 1}`)
        .send({ email: address, type: "sign-in" })
        .expect(200);
    }

    await expect(prisma.emailLog.count({ where: { to: address, type: "auth_otp" } })).resolves.toBe(
      SIGN_IN_CODES_PER_HOUR,
    );
  });
});
