// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { trialSubscription } from "../src/billing/plans";
import { PrismaService } from "../src/database/prisma.service";
import { RetentionService } from "../src/retention/retention.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;
const monthsAgo = (months: number) => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
};

// ADR 0128: what the daily retention task deletes, and what it leaves.
describe("Retention", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let retention: RetentionService;
  let ownerCookie: string;
  let locationId: string;
  const stamp = Date.now();

  async function createLocation() {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Retention",
        location: {
          name: "Retention",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@retention.test",
          locale: "FR",
        },
      });
    const id = created.body.locations[0].id as string;
    // Only an Owner's first Business gets a trial, and this one has many.
    await prisma.subscription.update({ where: { locationId: id }, data: trialSubscription() });
    return id;
  }

  async function createTicket(at = locationId) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${at}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Portière", description: "Rayure", customer: { fullName: "Chloé Dubois" } });
    expect(response.status).toBe(201);
    return { ticketId: BigInt(response.body.id), customerId: BigInt(response.body.customer.id) };
  }

  // Ends the Ticket, or only ages it, as if it happened that long ago.
  async function age(ticketId: bigint, customerId: bigint, since: Date, end = true) {
    if (end) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { currentStatus: { connect: { code: "COMPLETED" } } },
      });
    }
    await prisma.ticketStatusEvent.updateMany({ where: { ticketId }, data: { createdAt: since } });
    await prisma.customer.update({ where: { id: customerId }, data: { createdAt: since } });
  }

  async function customer(id: bigint) {
    return prisma.customer.findUniqueOrThrow({ where: { id }, include: { tickets: true } });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    retention = app.get(RetentionService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+retention-${stamp}@resend.dev`);
    locationId = await createLocation();
  });

  afterAll(async () => {
    await app.close();
  });

  it("clears what emails said after 30 days, and keeps that they were sent", async () => {
    const content = {
      subject: "Votre portière",
      html: "<p>Chloé</p>",
      text: "Chloé",
      attachments: [{ filename: "ready-date.ics", content: "QkVHSU4=", contentType: "text/calendar" }],
      type: "ticket_status_update",
      status: "DELIVERED" as const,
    };
    const old = await prisma.emailLog.create({
      data: { ...content, to: `delivered+old-${stamp}@resend.dev`, createdAt: new Date(Date.now() - 31 * DAY_MS) },
    });
    const recent = await prisma.emailLog.create({
      data: { ...content, to: `delivered+recent-${stamp}@resend.dev`, createdAt: new Date(Date.now() - 29 * DAY_MS) },
    });

    await retention.clearOldEmailContent();

    await expect(prisma.emailLog.findUniqueOrThrow({ where: { id: old.id } })).resolves.toMatchObject({
      to: `delivered+old-${stamp}@resend.dev`,
      subject: "Votre portière",
      status: "DELIVERED",
      html: null,
      text: null,
      attachments: null,
    });
    await expect(prisma.emailLog.findUniqueOrThrow({ where: { id: recent.id } })).resolves.toMatchObject({
      html: "<p>Chloé</p>",
      text: "Chloé",
    });
  });

  it("deletes expired sessions and sign-in codes, and keeps live ones", async () => {
    const { id: userId } = await prisma.user.findUniqueOrThrow({
      where: { email: `delivered+retention-${stamp}@resend.dev` },
    });
    const session = (label: string, expiresAt: Date) => ({
      id: `${label}-${stamp}`,
      token: `${label}-${stamp}`,
      userId,
      expiresAt,
    });
    const code = (label: string, expiresAt: Date) => ({
      id: `${label}-${stamp}`,
      identifier: `${label}-${stamp}`,
      value: "123456",
      expiresAt,
    });
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + DAY_MS);
    await prisma.session.createMany({ data: [session("expired", past), session("live", future)] });
    await prisma.verification.createMany({ data: [code("expired", past), code("live", future)] });

    await retention.deleteExpiredSignIns();

    expect(await prisma.session.findMany({ where: { id: { endsWith: `-${stamp}` } }, select: { id: true } })).toEqual([
      { id: `live-${stamp}` },
    ]);
    expect(
      await prisma.verification.findMany({ where: { id: { endsWith: `-${stamp}` } }, select: { id: true } }),
    ).toEqual([{ id: `live-${stamp}` }]);
  });

  it("erases a Customer whose last Ticket ended over 24 months ago", async () => {
    const { ticketId, customerId } = await createTicket();
    await age(ticketId, customerId, monthsAgo(25));

    await retention.eraseInactiveCustomers();

    const erased = await customer(customerId);
    expect(erased).toMatchObject({ fullName: "[deleted]", email: null, phone: null });
    expect(erased.deletedAt).not.toBeNull();
    expect(erased.tickets[0]).toMatchObject({ title: "[deleted]", description: null });
  });

  it("keeps a Customer with a Ticket that ended within 24 months, or one still open", async () => {
    const ended = await createTicket();
    await age(ended.ticketId, ended.customerId, monthsAgo(23));
    const open = await createTicket();
    await age(open.ticketId, open.customerId, monthsAgo(25), false);

    await retention.eraseInactiveCustomers();

    expect((await customer(ended.customerId)).deletedAt).toBeNull();
    expect((await customer(open.customerId)).deletedAt).toBeNull();
  });

  it("erases the Customers left at a Location deleted before ADR 0128", async () => {
    const deletedLocationId = await createLocation();
    const { customerId } = await createTicket(deletedLocationId);
    await prisma.location.update({ where: { id: deletedLocationId }, data: { deletedAt: new Date() } });

    await retention.eraseInactiveCustomers();

    expect((await customer(customerId)).fullName).toBe("[deleted]");
  });
});
