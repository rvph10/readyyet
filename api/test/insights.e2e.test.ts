// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { calendarDateIn } from "@readyyet/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const TIME_ZONE = "Europe/Brussels";
const DAY_MS = 24 * 60 * 60 * 1000;

interface Insights {
  setup: Record<string, boolean>;
  received: { months: { month: string; received: number }[]; lastMonthSoFar: number };
  customers: { new: number; returning: number };
  activity: { ticketTitle: string; changedByName: string; status: { code: string } }[];
}

// ADR 0116.
describe("Insights", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let locationId: string;
  const stamp = Date.now();
  const inDays = (days: number) => calendarDateIn(new Date(Date.now() + days * DAY_MS), TIME_ZONE);

  async function createTicket(title: string, customer: { customerId: string } | { customer: object }) {
    const { body } = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send({ title, ...customer })
      .expect(201);
    return body as { id: string; customer: { id: string } };
  }

  const move = (id: string, statusCode: string) =>
    request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${id}/status`)
      .set("Cookie", cookie)
      .send({ statusCode })
      .expect(200);

  const insights = async () =>
    (await request(app.getHttpServer()).get(`/locations/${locationId}/insights`).set("Cookie", cookie).expect(200))
      .body as Insights;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cookie = await signInViaOtp(app, prisma, `delivered+insights-${stamp}@resend.dev`);
    const { body } = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        name: "Insights Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: TIME_ZONE,
          contactPhone: "+12125550123",
          contactEmail: "shop@insightstest.test",
          locale: "EN",
        },
      })
      .expect(201);
    locationId = body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows a new Location what's left to set up", async () => {
    const { setup, received, activity } = await insights();
    expect(setup).toEqual({
      address: false,
      openingHours: false,
      turnaround: false,
      reviewLink: false,
      logo: false,
      team: false,
      firstTicket: false,
      firstHandover: false,
    });
    expect(received.months).toHaveLength(6);
    expect(received.months.at(-1)).toEqual({ month: inDays(0).slice(0, 7), received: 0 });
    expect(activity).toEqual([]);
  });

  it("tells new Customers from returning ones", async () => {
    const first = await createTicket("Old visit", { customer: { fullName: "Regular", phone: "+32471000000" } });
    const longAgo = new Date(Date.now() - 70 * DAY_MS);
    await prisma.ticket.update({ where: { id: BigInt(first.id) }, data: { createdAt: longAgo } });
    await prisma.ticketStatusEvent.updateMany({ where: { ticketId: BigInt(first.id) }, data: { createdAt: longAgo } });
    await createTicket("Back again", { customerId: first.customer.id });
    await createTicket("First visit", { customer: { fullName: "Newcomer", phone: "+32471000001" } });

    const { customers, received, setup } = await insights();
    expect(customers).toEqual({ new: 1, returning: 1 });
    expect(received.months.at(-1)?.received).toBe(2);
    expect(received.months.reduce((sum, { received }) => sum + received, 0)).toBe(3);
    expect(setup.firstTicket).toBe(true);
  });

  it("lists the latest changes, newest first, and sees the first handover", async () => {
    const { id } = await createTicket("Handed over", { customer: { fullName: "C", phone: "+32471000002" } });
    await move(id, "READY");
    await move(id, "COMPLETED");

    const { activity, setup } = await insights();
    expect(activity.map(({ status }) => status.code).slice(0, 3)).toEqual(["COMPLETED", "READY", "RECEIVED"]);
    expect(activity[0]).toMatchObject({ ticketTitle: "Handed over" });
    expect(activity[0].changedByName).toBeTruthy();
    expect(setup.firstHandover).toBe(true);
  });

  it("doesn't count an invitation past its date as a team", async () => {
    await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", cookie)
      .send({ email: `delivered+insights-invitee-${stamp}@resend.dev`, role: "EMPLOYEE" })
      .expect(201);
    expect((await insights()).setup.team).toBe(true);
    await prisma.invitation.updateMany({ where: { locationId }, data: { expiresAt: new Date(Date.now() - DAY_MS) } });
    expect((await insights()).setup.team).toBe(false);
  });

  it("is refused to someone outside the Location", async () => {
    const stranger = await signInViaOtp(app, prisma, `delivered+insights-stranger-${stamp}@resend.dev`);
    const { status } = await request(app.getHttpServer())
      .get(`/locations/${locationId}/insights`)
      .set("Cookie", stranger);
    expect([403, 404]).toContain(status);
  });
});
