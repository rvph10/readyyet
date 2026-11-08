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
      .body;

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
    const { setup, received, promise, activity, yourDay } = await insights();
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
    expect(promise).toMatchObject({ readied: 0, averageDays: null });
    expect(activity).toEqual([]);
    expect(yourDay).toEqual({ created: 0, moved: 0 });
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
    expect(received.months.at(-1).received).toBe(2);
    expect(received.months.reduce((sum: number, { received }: { received: number }) => sum + received, 0)).toBe(3);
    expect(setup.firstTicket).toBe(true);
  });

  it("counts the promises kept, and a Ticket readied twice once", async () => {
    const onTime = await createTicket("On time", { customer: { fullName: "A", phone: "+32471000002" } });
    const late = await createTicket("Late", { customer: { fullName: "B", phone: "+32471000003" } });
    await prisma.ticket.update({
      where: { id: BigInt(onTime.id) },
      data: { estimatedReadyDate: new Date(`${inDays(1)}T00:00:00Z`) },
    });
    await prisma.ticket.update({
      where: { id: BigInt(late.id) },
      data: { estimatedReadyDate: new Date(`${inDays(-2)}T00:00:00Z`) },
    });
    await move(onTime.id, "READY");
    await move(late.id, "READY");
    await move(late.id, "REPAIRING");
    await move(late.id, "READY");

    const { promise } = await insights();
    expect(promise).toMatchObject({ readied: 2, dated: 2, onTime: 1, turnaroundDays: null });
    expect(promise.averageDays).toBe(0);
  });

  it("lists the latest changes and the User's own day", async () => {
    const { activity, yourDay, setup } = await insights();
    expect(activity).toHaveLength(8);
    expect(activity[0]).toMatchObject({ ticketTitle: "Late", status: expect.objectContaining({ code: "READY" }) });
    expect(activity[0].changedByName).toBeTruthy();
    expect(yourDay).toEqual({ created: 4, moved: 4 });
    expect(setup.firstHandover).toBe(false);
  });
});
