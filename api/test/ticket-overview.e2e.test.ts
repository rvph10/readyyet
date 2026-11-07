// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { calendarDateIn, LONG_WAIT_DAYS } from "@readyyet/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const TIME_ZONE = "Europe/Brussels";
const DAY_MS = 24 * 60 * 60 * 1000;

interface Overview {
  counts: Record<string, number>;
  steps: { status: { code: string }; count: number }[];
  handedOver: { days: { date: string; count: number }[]; previousWeek: number };
  tickets: {
    id: string;
    title: string;
    statusSince: string;
    nextStatus: { code: string } | null;
    emailFails: boolean;
    customer: { phone: string | null };
  }[];
  needsYou: Record<"collected" | "failing" | "longWaits", { id: string }[]>;
}

// ADR 0088.
describe("Ticket overview", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let locationId: string;
  const stamp = Date.now();
  const inDays = (days: number) => calendarDateIn(new Date(Date.now() + days * DAY_MS), TIME_ZONE);

  async function createTicket(title: string, estimatedReadyDate?: string) {
    const { body } = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send({ title, customer: { fullName: `Customer ${title}`, phone: "+32471000000" } })
      .expect(201);
    if (estimatedReadyDate) {
      await prisma.ticket.update({
        where: { id: BigInt(body.id) },
        data: { estimatedReadyDate: new Date(`${estimatedReadyDate}T00:00:00Z`) },
      });
    }
    return body.id as string;
  }

  const move = (id: string, statusCode: string) =>
    request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${id}/status`)
      .set("Cookie", cookie)
      .send({ statusCode })
      .expect(200);

  const overview = async () =>
    (
      await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets/overview`)
        .set("Cookie", cookie)
        .expect(200)
    ).body as Overview;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cookie = await signInViaOtp(app, prisma, `delivered+overview-${stamp}@resend.dev`);
    const { body } = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", cookie)
      .send({
        name: "Overview Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: TIME_ZONE,
          contactPhone: "+12125550123",
          contactEmail: "shop@overviewtest.test",
          locale: "EN",
        },
      })
      .expect(201);
    locationId = body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("is empty for a new Location, with a full week of days", async () => {
    const { counts, steps, handedOver, tickets } = await overview();
    expect(counts.open).toBe(0);
    expect(steps).toEqual([]);
    expect(tickets).toEqual([]);
    expect(handedOver.days).toHaveLength(7);
    expect(handedOver.days.at(-1)).toEqual({ date: inDays(0), count: 0 });
  });

  it("counts open Tickets and sorts them by urgency", async () => {
    const later = await createTicket("Later", inDays(5));
    const undated = await createTicket("Undated");
    const today = await createTicket("Today", inDays(0));
    const tomorrow = await createTicket("Tomorrow", inDays(1));
    const late = await createTicket("Late", inDays(-2));
    const ready = await createTicket("Ready", inDays(-3));
    await move(ready, "DIAGNOSING");
    await move(ready, "REPAIRING");
    await move(ready, "READY");
    const collected = await createTicket("Collected");
    await move(collected, "READY");
    await prisma.ticket.update({ where: { id: BigInt(collected) }, data: { customerCollectedAt: new Date() } });

    const { counts, tickets, steps } = await overview();
    expect(counts).toMatchObject({ open: 7, ready: 2, late: 1, dueToday: 1, dueTomorrow: 1, inShop: 5, toConfirm: 1 });
    expect(tickets.map(({ id }) => id)).toEqual([late, ready, collected, today, tomorrow, later, undated]);
    expect(steps).toEqual([
      expect.objectContaining({ count: 5, status: expect.objectContaining({ code: "RECEIVED" }) }),
      expect.objectContaining({ count: 2, status: expect.objectContaining({ code: "READY" }) }),
    ]);
  });

  it("gives each Ticket its next step, COMPLETED only after READY", async () => {
    const { tickets } = await overview();
    expect(tickets.find(({ title }) => title === "Late")?.nextStatus?.code).toBe("DIAGNOSING");
    expect(tickets.find(({ title }) => title === "Ready")?.nextStatus?.code).toBe("COMPLETED");
  });

  it("shows when a Ticket reached its Status and how to reach the Customer", async () => {
    const { tickets } = await overview();
    const { statusSince, customer } = tickets.find(({ title }) => title === "Ready")!;
    expect(Date.now() - new Date(statusSince).getTime()).toBeLessThan(60_000);
    expect(customer.phone).toBe("+32471000000");
  });

  it("leaves ended Tickets out and counts them as handed over today", async () => {
    const id = await createTicket("Handed over");
    await move(id, "READY");
    await move(id, "COMPLETED");
    const { counts, handedOver, tickets } = await overview();
    expect(tickets.some((ticket) => ticket.id === id)).toBe(false);
    expect(counts.open).toBe(7);
    expect(handedOver.days.at(-1)?.count).toBe(1);
  });

  it("counts last week's handovers apart from this week's", async () => {
    const id = await createTicket("Last week");
    await move(id, "READY");
    await move(id, "COMPLETED");
    await prisma.ticketStatusEvent.updateMany({
      where: { ticketId: BigInt(id), status: { code: "COMPLETED" } },
      data: { createdAt: new Date(Date.now() - 9 * DAY_MS) },
    });
    const { handedOver } = await overview();
    expect(handedOver.previousWeek).toBe(1);
    expect(handedOver.days.reduce((sum, { count }) => sum + count, 0)).toBe(1);
  });

  it("flags a Customer whose emails bounce", async () => {
    const id = await createTicket("Bounced");
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(id) } });
    await prisma.customer.update({ where: { id: ticket.customerId }, data: { emailBouncedAt: new Date() } });
    const { tickets } = await overview();
    expect(tickets.find((item) => item.id === id)?.emailFails).toBe(true);
  });

  describe("past the 100 Tickets the table shows", () => {
    let quiet: { collected: string; failing: string; waiting: string; fresh: string };
    const farOff = inDays(60);

    beforeAll(async () => {
      // Straight into the database, as creating them through the API would hit its rate limit.
      const first = await createTicket("Busy", inDays(-5));
      const { statusEvents, ...ticket } = await prisma.ticket.findUniqueOrThrow({
        where: { id: BigInt(first) },
        omit: { id: true },
        include: { statusEvents: { omit: { id: true, ticketId: true } } },
      });
      for (let index = 1; index < 100; index++) {
        const copy = await prisma.ticket.create({
          data: { ...ticket, trackingCode: `${ticket.trackingCode}${index}` },
        });
        await prisma.ticketStatusEvent.create({ data: { ...statusEvents[0], ticketId: copy.id } });
      }
      const [collected, failing, waiting, fresh] = await Promise.all(
        ["Quiet collected", "Quiet failing", "Quiet waiting", "Quiet fresh"].map((title) =>
          createTicket(title, farOff),
        ),
      );
      quiet = { collected, failing, waiting, fresh };

      await prisma.ticket.update({ where: { id: BigInt(collected) }, data: { customerCollectedAt: new Date() } });
      const { customerId } = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(failing) } });
      await prisma.customer.update({ where: { id: customerId }, data: { emailBouncedAt: new Date() } });
      for (const id of [waiting, fresh]) await move(id, "READY");
      await prisma.ticketStatusEvent.updateMany({
        where: { ticketId: BigInt(waiting) },
        data: { createdAt: new Date(Date.now() - LONG_WAIT_DAYS * DAY_MS) },
      });
    });

    const ids = (tickets: { id: string }[]) => tickets.map(({ id }) => id);

    it("still lists what needs a person, however far down it is", async () => {
      const { tickets, needsYou, counts } = await overview();
      expect(tickets).toHaveLength(100);
      expect(counts.open).toBeGreaterThan(100);
      expect(ids(tickets)).not.toContain(quiet.collected);
      expect(ids(tickets)).not.toContain(quiet.failing);
      expect(ids(needsYou.collected)).toContain(quiet.collected);
      expect(ids(needsYou.failing)).toContain(quiet.failing);
      expect(ids(needsYou.longWaits)).toContain(quiet.waiting);
    });

    it("leaves out a shorter wait, and one the Customer says is over", async () => {
      await prisma.ticket.update({ where: { id: BigInt(quiet.waiting) }, data: { customerCollectedAt: new Date() } });
      const { needsYou } = await overview();
      expect(ids(needsYou.longWaits)).not.toContain(quiet.fresh);
      expect(ids(needsYou.longWaits)).not.toContain(quiet.waiting);
    });
  });

  it("is refused to someone with no Membership", async () => {
    const stranger = await signInViaOtp(app, prisma, `delivered+overview-stranger-${stamp}@resend.dev`);
    await request(app.getHttpServer())
      .get(`/locations/${locationId}/tickets/overview`)
      .set("Cookie", stranger)
      .expect((response) => expect([403, 404]).toContain(response.status));
  });
});
