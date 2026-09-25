// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Role } from "@readyyet/db";
import { calendarDateIn, turnaroundReadyDate } from "@readyyet/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { NotificationService } from "../src/notification/notification.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0030 and ADR 0036.
describe("Estimated ready date", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notification: NotificationService;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+ready-date-${stamp}-${label}@resend.dev`;
  const today = () => calendarDateIn(new Date(), "Europe/Brussels");
  const inDays = (days: number) =>
    new Date(new Date(`${today()}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  async function createTicket(body: { email?: string; estimatedReadyDate?: string | null } = {}) {
    const { email, ...rest } = body;
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Veste en cuir", customer: { fullName: "Chloé Dubois", email }, ...rest });
    return response;
  }

  function patchTicket(ticketId: string, estimatedReadyDate: string | null, cookie = ownerCookie) {
    return request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}`)
      .set("Cookie", cookie)
      .send({ estimatedReadyDate });
  }

  function patchLocation(body: object) {
    return request(app.getHttpServer()).patch(`/locations/${locationId}`).set("Cookie", ownerCookie).send(body);
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
    expect(response.status).toBe(200);
  }

  function ticketRow(ticketId: string) {
    return prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticketId) } });
  }

  async function makeDueAndSweep(ticketId: string) {
    await prisma.ticket.updateMany({
      where: { id: BigInt(ticketId), readyDateEmailDueAt: { not: null } },
      data: { readyDateEmailDueAt: new Date(Date.now() - 1000) },
    });
    await notification.sendDueReadyDateEmails();
  }

  function emailsTo(label: string, type: string) {
    return prisma.emailLog.findMany({ where: { to: address(label), type }, orderBy: { createdAt: "asc" } });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+ready-date-owner-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Ready Date Test",
        location: {
          name: "Maroquinerie Lumière",
          businessTypeCode: "LEATHER_GOODS",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@lumiere.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const employeeEmail = `delivered+ready-date-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
    await prisma.membership.create({ data: { userId: employee.id, locationId, role: Role.EMPLOYEE } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("turnaround time", () => {
    it("is set and cleared by PATCH /locations/:id, 1 to 60 days", async () => {
      expect((await patchLocation({ turnaroundDays: 3 })).body.turnaroundDays).toBe(3);
      expect((await patchLocation({ turnaroundDays: 0 })).status).toBe(400);
      expect((await patchLocation({ turnaroundDays: 61 })).status).toBe(400);
      expect((await patchLocation({ turnaroundDays: 1.5 })).status).toBe(400);
      expect((await patchLocation({ turnaroundDays: null })).body.turnaroundDays).toBeNull();
    });

    it("prefills a new ticket's date, counting open days only", async () => {
      const openingHours = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((dayOfWeek) => ({
        dayOfWeek,
        opens: "09:00",
        closes: "18:00",
      }));
      await patchLocation({ turnaroundDays: 3, openingHours });

      const response = await createTicket();

      expect(response.status).toBe(201);
      expect(response.body.estimatedReadyDate).toBe(
        turnaroundReadyDate({ droppedOffAt: new Date(), turnaroundDays: 3, timeZone: "Europe/Brussels", openingHours }),
      );
    });

    it("leaves the date empty when sent null, or when the Location has no turnaround time", async () => {
      expect((await createTicket({ estimatedReadyDate: null })).body.estimatedReadyDate).toBeNull();

      await patchLocation({ turnaroundDays: null });
      expect((await createTicket()).body.estimatedReadyDate).toBeNull();
    });
  });

  describe("on a ticket", () => {
    it("takes a date sent at creation as it is", async () => {
      expect((await createTicket({ estimatedReadyDate: inDays(4) })).body.estimatedReadyDate).toBe(inDays(4));
    });

    it("refuses a past date, a day that doesn't exist, and anything but YYYY-MM-DD", async () => {
      expect((await createTicket({ estimatedReadyDate: inDays(-1) })).status).toBe(400);
      expect((await createTicket({ estimatedReadyDate: "2030-02-30" })).status).toBe(400);
      expect((await createTicket({ estimatedReadyDate: "2030-02-03T10:00:00Z" })).status).toBe(400);
      expect((await createTicket({ estimatedReadyDate: today() })).status).toBe(201);
    });

    it("is changed and cleared while the ticket is open, and shown in the list", async () => {
      const ticket = (await createTicket()).body;

      expect((await patchTicket(ticket.id, inDays(2))).body.estimatedReadyDate).toBe(inDays(2));
      const list = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets`)
        .set("Cookie", ownerCookie);
      expect(list.body.items.find((item: { id: string }) => item.id === ticket.id).estimatedReadyDate).toBe(inDays(2));

      expect((await patchTicket(ticket.id, null)).body.estimatedReadyDate).toBeNull();
    });

    it("is set by any member of the Location, an Employee included", async () => {
      const ticket = (await createTicket()).body;

      const response = await patchTicket(ticket.id, inDays(3), employeeCookie);

      expect(response.status).toBe(200);
      expect(response.body.estimatedReadyDate).toBe(inDays(3));
    });

    it("can't change once the ticket has ended, but the same date sent back is fine", async () => {
      const ticket = (await createTicket({ estimatedReadyDate: inDays(2) })).body;
      await setStatus(ticket.id, "CANCELLED");

      expect((await patchTicket(ticket.id, inDays(3))).status).toBe(409);
      expect((await patchTicket(ticket.id, inDays(2))).status).toBe(200);
    });

    it("keeps a date that has passed when a form sends it back unchanged", async () => {
      const ticket = (await createTicket()).body;
      await prisma.ticket.update({
        where: { id: BigInt(ticket.id) },
        data: { estimatedReadyDate: new Date(inDays(-3)) },
      });

      const response = await request(app.getHttpServer())
        .patch(`/locations/${locationId}/tickets/${ticket.id}`)
        .set("Cookie", ownerCookie)
        .send({ title: "Veste en daim", estimatedReadyDate: inDays(-3) });

      expect(response.status).toBe(200);
      expect(response.body.estimatedReadyDate).toBe(inDays(-3));
    });
  });

  describe("tracking page", () => {
    it("shows the date until the ticket is READY", async () => {
      const ticket = (await createTicket({ estimatedReadyDate: inDays(2) })).body;
      const tracking = () => request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

      expect((await tracking()).body.estimatedReadyDate).toBe(inDays(2));

      await setStatus(ticket.id, "READY");
      expect((await tracking()).body.estimatedReadyDate).toBeNull();
    });
  });

  describe("customer emails", () => {
    it("sweeps for due emails every 30 seconds", () => {
      const job = app.get(SchedulerRegistry).getCronJob("customer-ready-date-emails");

      expect(job.cronTime.source).toBe("*/30 * * * * *");
    });

    it("states the date in the ticket-created email, and remembers it was told", async () => {
      const date = inDays(2);
      const ticket = (await createTicket({ email: address("created"), estimatedReadyDate: date })).body;

      const [email] = await emailsTo("created", "ticket_tracking_link");
      const written = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(
        new Date(date),
      );
      expect(email.text).toContain(`It should be ready on`);
      expect(email.text).toContain(written);
      expect((await ticketRow(ticket.id)).customerToldReadyDate).toEqual(new Date(date));
    });

    it("emails a later date once its delay has passed", async () => {
      const ticket = (await createTicket({ email: address("later"), estimatedReadyDate: inDays(2) })).body;
      const before = Date.now();

      await patchTicket(ticket.id, inDays(5));
      const due = (await ticketRow(ticket.id)).readyDateEmailDueAt!.getTime() - before;
      expect(due).toBeGreaterThanOrEqual(130_000);
      expect(due).toBeLessThan(135_000);

      await notification.sendDueReadyDateEmails();
      expect(await emailsTo("later", "ticket_ready_date_changed")).toHaveLength(0);

      await makeDueAndSweep(ticket.id);
      const [email] = await emailsTo("later", "ticket_ready_date_changed");
      expect(email.subject).toBe("New date for your repair at Maroquinerie Lumière");
      const row = await ticketRow(ticket.id);
      expect(row.customerToldReadyDate).toEqual(new Date(inDays(5)));
      expect(row.readyDateEmailDueAt).toBeNull();
    });

    it("sends nothing for a later date corrected back within the delay", async () => {
      const ticket = (await createTicket({ email: address("corrected"), estimatedReadyDate: inDays(2) })).body;

      await patchTicket(ticket.id, inDays(20));
      await patchTicket(ticket.id, inDays(2));
      expect((await ticketRow(ticket.id)).readyDateEmailDueAt).toBeNull();

      await prisma.ticket.update({
        where: { id: BigInt(ticket.id) },
        data: { estimatedReadyDate: new Date(inDays(2)), readyDateEmailDueAt: new Date(Date.now() - 1000) },
      });
      await notification.sendDueReadyDateEmails();
      expect(await emailsTo("corrected", "ticket_ready_date_changed")).toHaveLength(0);
    });

    it("sends nothing for an earlier date, or a first date set after drop-off", async () => {
      const earlier = (await createTicket({ email: address("earlier"), estimatedReadyDate: inDays(5) })).body;
      await patchTicket(earlier.id, inDays(2));
      expect((await ticketRow(earlier.id)).readyDateEmailDueAt).toBeNull();

      const first = (await createTicket({ email: address("first"), estimatedReadyDate: null })).body;
      await patchTicket(first.id, inDays(2));
      expect((await ticketRow(first.id)).readyDateEmailDueAt).toBeNull();
    });

    it("sends nothing after the Customer stopped updates", async () => {
      const ticket = (await createTicket({ email: address("stopped"), estimatedReadyDate: inDays(2) })).body;
      await patchTicket(ticket.id, inDays(5));
      const stopped = await request(app.getHttpServer()).post(`/tracking/${ticket.trackingCode}/stop-notifications`);
      expect(stopped.status).toBe(204);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("stopped", "ticket_ready_date_changed")).toHaveLength(0);
      expect((await ticketRow(ticket.id)).readyDateEmailDueAt).toBeNull();
    });

    it("sends nothing once the ticket reached READY during the delay", async () => {
      const ticket = (await createTicket({ email: address("ready"), estimatedReadyDate: inDays(2) })).body;
      await patchTicket(ticket.id, inDays(5));
      await setStatus(ticket.id, "READY");

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("ready", "ticket_ready_date_changed")).toHaveLength(0);
      expect((await ticketRow(ticket.id)).readyDateEmailDueAt).toBeNull();
    });
  });

  describe("overdue filter", () => {
    it("lists open tickets past their date that aren't READY yet", async () => {
      const overdue = (await createTicket()).body;
      const ready = (await createTicket()).body;
      const future = (await createTicket({ estimatedReadyDate: inDays(1) })).body;
      const noDate = (await createTicket({ estimatedReadyDate: null })).body;
      await prisma.ticket.updateMany({
        where: { id: { in: [BigInt(overdue.id), BigInt(ready.id)] } },
        data: { estimatedReadyDate: new Date(inDays(-1)) },
      });
      await setStatus(ready.id, "READY");

      const response = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets?overdue=true&take=100`)
        .set("Cookie", ownerCookie);

      const ids = response.body.items.map((item: { id: string }) => item.id);
      expect(ids).toContain(overdue.id);
      expect(ids).not.toContain(ready.id);
      expect(ids).not.toContain(future.id);
      expect(ids).not.toContain(noDate.id);
    });

    it("only filters on true", async () => {
      const all = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets?overdue=false&take=100`)
        .set("Cookie", ownerCookie);
      expect(all.status).toBe(200);
      expect(
        all.body.items.some((item: { estimatedReadyDate: string | null }) => item.estimatedReadyDate === null),
      ).toBe(true);

      const invalid = await request(app.getHttpServer())
        .get(`/locations/${locationId}/tickets?overdue=yes`)
        .set("Cookie", ownerCookie);
      expect(invalid.status).toBe(400);
    });
  });
});
