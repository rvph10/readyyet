// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Role } from "@readyyet/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { NotificationService } from "../src/notification/notification.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;

// A region where it's currently within, or outside, the 9:00 to 19:00
// reminder window, so the sweep runs at the real time of day.
function zoneWhere(inWindow: boolean) {
  return Intl.supportedValuesOf("timeZone").find((timeZone) => {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()),
    );
    // A margin of an hour on each side, so a test never runs on the edge.
    return inWindow ? hour >= 10 && hour < 18 : hour >= 1 && hour < 7;
  })!;
}

// ADR 0028 and ADR 0037.
describe("Uncollected item reminders", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notification: NotificationService;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+reminder-${stamp}-${label}@resend.dev`;

  async function createTicket(label: string | null) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Brake pads", customer: { fullName: "Alice Martin", ...(label && { email: address(label) }) } });
    return response.body as { id: string; trackingCode: string };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
    expect(response.status).toBe(200);
  }

  async function readyTicket(label: string | null) {
    const ticket = await createTicket(label);
    await setStatus(ticket.id, "READY");
    return ticket;
  }

  function ticketRow(ticketId: string) {
    return prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticketId) } });
  }

  async function readyAt(ticketId: string) {
    const [event] = await prisma.ticketStatusEvent.findMany({
      where: { ticketId: BigInt(ticketId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 1,
    });
    return event.createdAt;
  }

  async function makeDueAndSweep(ticketId: string) {
    await prisma.ticket.update({
      where: { id: BigInt(ticketId) },
      data: { nextReadyReminderAt: new Date(Date.now() - 1000) },
    });
    await notification.sendDueReadyReminders();
  }

  function remindersTo(label: string) {
    return prisma.emailLog.findMany({
      where: { to: address(label), type: "ticket_ready_reminder" },
      orderBy: { createdAt: "asc" },
    });
  }

  function markCollected(trackingCode: string) {
    return request(app.getHttpServer()).post(`/tracking/${trackingCode}/collected`);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+reminder-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Reminder Test Garage",
        location: {
          name: "Joe's Garage",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "shop@reminders.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const employeeEmail = `delivered+reminder-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
    await prisma.membership.create({ data: { userId: employee.id, locationId, role: Role.EMPLOYEE } });
  });

  beforeEach(async () => {
    await prisma.location.update({ where: { id: locationId }, data: { timeZone: zoneWhere(true) } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("sweeps for due reminders every 15 minutes", () => {
    const job = app.get(SchedulerRegistry).getCronJob("customer-ready-reminders");

    expect(job.cronTime.source).toBe("0 */15 * * * *");
  });

  describe("schedule", () => {
    it("schedules the first reminder 3 days after the ticket reaches READY", async () => {
      const ticket = await readyTicket("scheduled");

      const row = await ticketRow(ticket.id);
      expect(row.readyRemindersSent).toBe(0);
      expect(row.nextReadyReminderAt).toEqual(new Date((await readyAt(ticket.id)).getTime() + 3 * DAY_MS));
    });

    it("sends the first, schedules the second 10 days after READY, then stops", async () => {
      const ticket = await readyTicket("twice");
      const since = await readyAt(ticket.id);

      await makeDueAndSweep(ticket.id);
      const [first] = await remindersTo("twice");
      expect(first.subject).toBe("Reminder: your repair is waiting for you at Joe's Garage");
      expect(first.html).toContain(`/t/${ticket.trackingCode}/collected`);
      let row = await ticketRow(ticket.id);
      expect(row.readyRemindersSent).toBe(1);
      expect(row.nextReadyReminderAt).toEqual(new Date(since.getTime() + 10 * DAY_MS));

      await makeDueAndSweep(ticket.id);
      expect(await remindersTo("twice")).toHaveLength(2);
      row = await ticketRow(ticket.id);
      expect(row.readyRemindersSent).toBe(2);
      expect(row.nextReadyReminderAt).toBeNull();
    });

    it("holds a reminder due at night until the morning", async () => {
      const ticket = await readyTicket("night");
      await prisma.location.update({ where: { id: locationId }, data: { timeZone: zoneWhere(false) } });

      await makeDueAndSweep(ticket.id);

      expect(await remindersTo("night")).toHaveLength(0);
      const row = await ticketRow(ticket.id);
      expect(row.readyRemindersSent).toBe(0);
      expect(row.nextReadyReminderAt!.getTime()).toBeLessThan(Date.now());

      await prisma.location.update({ where: { id: locationId }, data: { timeZone: zoneWhere(true) } });
      await notification.sendDueReadyReminders();
      expect(await remindersTo("night")).toHaveLength(1);
    });

    it("starts over when the ticket reaches READY again", async () => {
      const ticket = await readyTicket("again");
      await makeDueAndSweep(ticket.id);
      await setStatus(ticket.id, "REPAIRING");
      await setStatus(ticket.id, "READY");

      const row = await ticketRow(ticket.id);
      expect(row.readyRemindersSent).toBe(0);
      expect(row.nextReadyReminderAt).toEqual(new Date((await readyAt(ticket.id)).getTime() + 3 * DAY_MS));
    });

    it("picks up where it was when a move away from READY is undone", async () => {
      const ticket = await readyTicket("undo");
      await makeDueAndSweep(ticket.id);
      const before = await ticketRow(ticket.id);

      await setStatus(ticket.id, "REPAIRING");
      const undo = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets/${ticket.id}/status/undo`)
        .set("Cookie", ownerCookie);
      expect(undo.status).toBe(200);

      const after = await ticketRow(ticket.id);
      expect(after.readyRemindersSent).toBe(1);
      expect(after.nextReadyReminderAt).toEqual(before.nextReadyReminderAt);
    });

    it("sends nothing to a ticket that left READY, stopped updates, or has no email address", async () => {
      const left = await readyTicket("left");
      await setStatus(left.id, "REPAIRING");
      await makeDueAndSweep(left.id);
      expect(await remindersTo("left")).toHaveLength(0);

      const stopped = await readyTicket("stopped");
      await request(app.getHttpServer()).post(`/tracking/${stopped.trackingCode}/stop-notifications`);
      await makeDueAndSweep(stopped.id);
      expect(await remindersTo("stopped")).toHaveLength(0);

      // Counted anyway, so it isn't picked up again every sweep.
      const noEmail = await readyTicket(null);
      await makeDueAndSweep(noEmail.id);
      expect((await ticketRow(noEmail.id)).readyRemindersSent).toBe(1);
    });
  });

  describe("I already picked it up", () => {
    it("records the time, shows it on the tracking page, and stops the reminders", async () => {
      const ticket = await readyTicket("collected");

      expect((await markCollected(ticket.trackingCode)).status).toBe(204);
      const { customerCollectedAt } = await ticketRow(ticket.id);
      expect(customerCollectedAt).not.toBeNull();
      const tracking = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);
      expect(tracking.body.customerCollectedAt).toBe(customerCollectedAt!.toISOString());
      expect(tracking.body.currentStatus.code).toBe("READY");

      await makeDueAndSweep(ticket.id);
      expect(await remindersTo("collected")).toHaveLength(0);

      expect((await markCollected(ticket.trackingCode)).status).toBe(204);
      expect((await ticketRow(ticket.id)).customerCollectedAt).toEqual(customerCollectedAt);
    });

    it("is refused before READY, and 404s for an unknown code", async () => {
      const ticket = await createTicket(null);

      expect((await markCollected(ticket.trackingCode)).status).toBe(409);
      expect((await markCollected("doesNotExist1")).status).toBe(404);
    });

    it("is cleared when the ticket reaches READY again", async () => {
      const ticket = await readyTicket(null);
      await markCollected(ticket.trackingCode);
      await setStatus(ticket.id, "REPAIRING");
      await setStatus(ticket.id, "READY");

      expect((await ticketRow(ticket.id)).customerCollectedAt).toBeNull();
    });

    it("stays on the ticket as a record once it's COMPLETED", async () => {
      const ticket = await readyTicket(null);
      await markCollected(ticket.trackingCode);
      await setStatus(ticket.id, "COMPLETED");

      const detail = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets/${ticket.id}`)
        .set("Cookie", ownerCookie);
      expect(detail.body.customerCollectedAt).not.toBeNull();

      const dismiss = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets/${ticket.id}/customer-collected/dismiss`)
        .set("Cookie", ownerCookie);
      expect(dismiss.status).toBe(409);
    });
  });

  describe("staff", () => {
    it("list the tickets whose customer says collected", async () => {
      const collected = await readyTicket(null);
      const waiting = await readyTicket(null);
      await markCollected(collected.trackingCode);

      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets?customerCollected=true&take=100`)
        .set("Cookie", ownerCookie);

      const items = response.body.items as { id: string; customerCollectedAt: string | null }[];
      expect(items.map((item) => item.id)).toContain(collected.id);
      expect(items.map((item) => item.id)).not.toContain(waiting.id);
      expect(items.every((item) => item.customerCollectedAt !== null)).toBe(true);
    });

    it("dismiss the mark, an Employee included, and the reminders not sent yet go out", async () => {
      const ticket = await readyTicket("dismissed");
      await markCollected(ticket.trackingCode);

      const dismiss = await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets/${ticket.id}/customer-collected/dismiss`)
        .set("Cookie", employeeCookie);
      expect(dismiss.status).toBe(200);
      expect(dismiss.body.customerCollectedAt).toBeNull();

      await makeDueAndSweep(ticket.id);
      expect(await remindersTo("dismissed")).toHaveLength(1);
    });
  });
});
