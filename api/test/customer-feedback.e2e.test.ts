// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Plan, SubscriptionStatus } from "@readyyet/db";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { EmailService } from "../src/email/email.service";
import { NotificationService } from "../src/notification/notification.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_URL = "https://g.page/r/CabcDEF123/review";

// ADR 0027, ADR 0039: a Pro Location with a Google review link emails
// "how did it go?" after COMPLETED, without the link, and the tracking
// page offers the link next to private feedback.
describe("Customer feedback", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notification: NotificationService;
  let ownerCookie: string;
  let adminCookie: string;
  let employeeCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+feedback-${stamp}-${label}@resend.dev`;
  let ipCounter = 0;

  async function createTicket(label: string, title = "Vidange") {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title, customer: { fullName: `Client ${label}`, email: address(label) } });
    return response.body as { id: string; trackingCode: string; customer: { id: string } };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
    expect(response.status).toBe(200);
  }

  async function complete(ticketId: string) {
    await setStatus(ticketId, "READY");
    await setStatus(ticketId, "COMPLETED");
  }

  async function makeDueAndSweep(ticketId: string) {
    await prisma.pendingStatusNotification.updateMany({
      where: { statusEvent: { ticketId: BigInt(ticketId) } },
      data: { sendAfter: new Date(Date.now() - 1000) },
    });
    await notification.sendDueStatusEmails();
  }

  function emailsTo(label: string, type: string) {
    return prisma.emailLog.findMany({ where: { to: address(label), type }, orderBy: { createdAt: "asc" } });
  }

  function patchLocation(body: object) {
    return request(app.getHttpServer()).patch(`/locations/${locationId}`).set("Cookie", ownerCookie).send(body);
  }

  function setSubscription(data: object) {
    return prisma.subscription.update({ where: { locationId }, data });
  }

  // Public, each call its own client: the route allows 5 a minute.
  function sendFeedback(trackingCode: string, message: unknown) {
    return request(app.getHttpServer())
      .post(`/tracking/${trackingCode}/feedback`)
      .set("X-Real-IP", `100.64.0.${++ipCounter}`)
      .send({ message });
  }

  function listFeedback(cookie: string, query = "") {
    return request(app.getHttpServer()).get(`/locations/${locationId}/feedback${query}`).set("Cookie", cookie);
  }

  async function join(email: string, role: "ADMIN" | "EMPLOYEE") {
    const cookie = await signInViaOtp(app, prisma, email);
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", cookie);
    return cookie;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, address("owner"));

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Feedback Test",
        location: {
          name: "Garage Martin",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@martin.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
    adminCookie = await join(address("admin"), "ADMIN");
    employeeCookie = await join(address("employee"), "EMPLOYEE");
  });

  // A first Location starts on a Pro trial, each test sets the link again.
  beforeEach(async () => {
    await setSubscription({
      status: SubscriptionStatus.TRIAL,
      plan: Plan.PRO,
      trialEndsAt: new Date(Date.now() + 10 * DAY_MS),
    });
    await prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: REVIEW_URL } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("the Google review link", () => {
    it.each([
      "https://g.page/r/CabcDEF123/review",
      "https://search.google.com/local/writereview?placeid=ChIJabc",
      "https://maps.app.goo.gl/abc123",
      "https://www.google.com/maps/place/Garage+Martin/@50.85,4.35,17z",
    ])("takes %s", async (url) => {
      const response = await patchLocation({ googleReviewUrl: url });

      expect(response.status).toBe(200);
      expect(response.body.googleReviewUrl).toBe(url);
    });

    it.each([
      "https://evil.example/review",
      "http://g.page/r/abc/review",
      "https://g.page.evil.example/r/abc",
      // Google's redirect, it would send Customers anywhere.
      "https://www.google.com/url?q=https://evil.example",
      "https://g.page/somewhere-else",
      "https://search.google.com/search?q=evil",
      "https://user@g.page/r/abc/review",
    ])("refuses %s", async (url) => {
      const response = await patchLocation({ googleReviewUrl: url });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("googleReviewUrl");
    });

    it("needs Pro to be set, but can be removed on any plan", async () => {
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      const set = await patchLocation({ googleReviewUrl: "https://g.page/r/other/review" });
      const removed = await patchLocation({ googleReviewUrl: null });

      expect(set.status).toBe(402);
      expect(set.body.error.code).toBe("PLAN_REQUIRED");
      expect(removed.status).toBe(200);
      expect(removed.body.googleReviewUrl).toBeNull();
    });
  });

  describe("the feedback email", () => {
    it("asks how it went once the Ticket is COMPLETED, without the Google link", async () => {
      const ticket = await createTicket("sent");
      await complete(ticket.id);

      await makeDueAndSweep(ticket.id);

      const [email] = await emailsTo("sent", "ticket_feedback_request");
      expect(email.subject).toBe("How did your repair at Garage Martin go?");
      expect(email.html).toContain(`/t/${ticket.trackingCode}`);
      expect(email.html).not.toContain("g.page");
    });

    it("tells the Customer about it in the ticket-created email", async () => {
      await createTicket("notice");

      const [email] = await emailsTo("notice", "ticket_tracking_link");
      expect(email.html).toContain("you&#x27;ll get one email asking how it went");
    });

    it("says nothing about it at drop-off when the Location doesn't ask", async () => {
      await prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: null } });

      await createTicket("no-notice");

      const [email] = await emailsTo("no-notice", "ticket_tracking_link");
      expect(email.html).not.toContain("asking how it went");
    });

    it("sends nothing for an undone COMPLETED", async () => {
      const ticket = await createTicket("undone");
      await complete(ticket.id);
      await request(app.getHttpServer())
        .post(`/locations/${locationId}/tickets/${ticket.id}/status/undo`)
        .set("Cookie", ownerCookie);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("undone", "ticket_feedback_request")).toHaveLength(0);
    });

    it("sends one per Ticket, even when it's completed again", async () => {
      const ticket = await createTicket("twice");
      await complete(ticket.id);
      await makeDueAndSweep(ticket.id);
      await complete(ticket.id);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("twice", "ticket_feedback_request")).toHaveLength(1);
    });

    it.each([
      [
        "without a Google link",
        () => prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: null } }),
      ],
      [
        "on Essentiel",
        () => setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null }),
      ],
      ["once the trial ended", () => setSubscription({ trialEndsAt: new Date(Date.now() - DAY_MS) })],
    ])("sends nothing %s, decided when it's due", async (_, change) => {
      const label = `off-${++ipCounter}`;
      const ticket = await createTicket(label);
      await complete(ticket.id);
      await change();

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo(label, "ticket_feedback_request")).toHaveLength(0);
    });

    it("sends nothing once the Customer stopped updates", async () => {
      const ticket = await createTicket("stopped");
      await complete(ticket.id);
      await request(app.getHttpServer()).post(`/tracking/${ticket.trackingCode}/stop-notifications`);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("stopped", "ticket_feedback_request")).toHaveLength(0);
    });
  });

  describe("the tracking page", () => {
    it("offers the Google link only once the Ticket is COMPLETED", async () => {
      const ticket = await createTicket("page");
      await setStatus(ticket.id, "READY");
      const ready = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);
      await setStatus(ticket.id, "COMPLETED");

      const completed = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

      expect(ready.body.reviewUrl).toBeNull();
      expect(completed.body.reviewUrl).toBe(REVIEW_URL);
      expect(completed.body.feedbackSentAt).toBeNull();
    });

    it("offers nothing on Essentiel", async () => {
      const ticket = await createTicket("page-essentiel");
      await complete(ticket.id);
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      const response = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);

      expect(response.body.reviewUrl).toBeNull();
    });
  });

  describe("private feedback", () => {
    it("takes the Customer's message once, and emails the Owner and Admins at once", async () => {
      const ticket = await createTicket("private", `Embrayage ${stamp}`);
      await complete(ticket.id);

      const response = await sendFeedback(ticket.trackingCode, "  The car still makes the noise.  ");

      expect(response.status).toBe(204);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored.message).toBe("The car still makes the noise.");
      // Sent in the background, after the response.
      await vi.waitFor(
        async () => {
          const sentTo = (
            await prisma.emailLog.findMany({
              where: { type: "feedback_received", html: { contains: `Embrayage ${stamp}` } },
            })
          ).map((email) => email.to);
          expect(sentTo.sort()).toEqual([address("admin"), address("owner")].sort());
        },
        { timeout: 10_000, interval: 200 },
      );
      const tracking = await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`);
      expect(tracking.body.feedbackSentAt).not.toBeNull();

      const again = await sendFeedback(ticket.trackingCode, "And another thing");
      expect(again.status).toBe(409);
    });

    it("answers without waiting for the staff emails", async () => {
      const ticket = await createTicket("no-wait");
      await complete(ticket.id);
      const send = vi.spyOn(app.get(EmailService), "send").mockReturnValue(new Promise(() => undefined));

      const response = await sendFeedback(ticket.trackingCode, "Quick answer please");

      expect(response.status).toBe(204);
      // The sends start after the response, and never finish here.
      await vi.waitFor(() => expect(send).toHaveBeenCalled());
      send.mockRestore();
    });

    it("refuses feedback before the Ticket is COMPLETED", async () => {
      const ticket = await createTicket("early");
      await setStatus(ticket.id, "READY");

      expect((await sendFeedback(ticket.trackingCode, "Too early")).status).toBe(409);
    });

    it("refuses feedback when the Location doesn't ask for it", async () => {
      const ticket = await createTicket("not-asked");
      await complete(ticket.id);
      await prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: null } });

      expect((await sendFeedback(ticket.trackingCode, "Hello")).status).toBe(409);
    });

    it("answers 404 once the tracking link has expired", async () => {
      const ticket = await createTicket("expired");
      await complete(ticket.id);
      await prisma.ticketStatusEvent.updateMany({
        where: { ticketId: BigInt(ticket.id) },
        data: { createdAt: new Date(Date.now() - 31 * DAY_MS) },
      });

      expect((await sendFeedback(ticket.trackingCode, "Late")).status).toBe(404);
    });

    it.each([
      ["an empty message", "   "],
      ["a message over 2000 characters", "x".repeat(2001)],
      ["no text", 42],
    ])("refuses %s", async (_, message) => {
      const ticket = await createTicket(`invalid-${++ipCounter}`);
      await complete(ticket.id);

      expect((await sendFeedback(ticket.trackingCode, message)).status).toBe(400);
    });

    it("is deleted when the Customer is erased", async () => {
      const ticket = await createTicket("erased");
      await complete(ticket.id);
      await sendFeedback(ticket.trackingCode, "Please forget me");

      await request(app.getHttpServer())
        .delete(`/locations/${locationId}/customers/${ticket.customer.id}`)
        .set("Cookie", ownerCookie);

      expect(await prisma.ticketFeedback.count({ where: { ticketId: BigInt(ticket.id) } })).toBe(0);
    });
  });

  describe("for staff", () => {
    let first: { id: string };
    let second: { id: string };

    beforeAll(async () => {
      await prisma.ticketFeedback.deleteMany({ where: { ticket: { locationId } } });
      for (const label of ["list-a", "list-b"]) {
        const ticket = await createTicket(label, `Ticket ${label}`);
        await complete(ticket.id);
        await sendFeedback(ticket.trackingCode, `Feedback ${label}`);
      }
      const { body } = await listFeedback(ownerCookie);
      [second, first] = body.items;
    });

    it("lists it newest first, with its Ticket and Customer", async () => {
      const response = await listFeedback(ownerCookie);

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { message: string }) => item.message)).toEqual([
        "Feedback list-b",
        "Feedback list-a",
      ]);
      expect(response.body.items[0]).toMatchObject({
        ticket: { title: "Ticket list-b" },
        customer: { fullName: "Client list-b" },
        handledAt: null,
        handledBy: null,
      });
    });

    it("pages through it", async () => {
      const page = await listFeedback(ownerCookie, "?take=1");
      const next = await listFeedback(ownerCookie, `?take=1&cursor=${page.body.nextCursor}`);

      expect(page.body.items[0].id).toBe(second.id);
      expect(next.body.items[0].id).toBe(first.id);
      expect(next.body.nextCursor).toBeNull();
    });

    it("marks it handled, keeping who did it first", async () => {
      const handled = await request(app.getHttpServer())
        .post(`/locations/${locationId}/feedback/${first.id}/handled`)
        .set("Cookie", adminCookie);
      await request(app.getHttpServer())
        .post(`/locations/${locationId}/feedback/${first.id}/handled`)
        .set("Cookie", ownerCookie);

      expect(handled.status).toBe(200);
      const [unhandled, done] = await Promise.all([
        listFeedback(ownerCookie, "?handled=false"),
        listFeedback(ownerCookie, "?handled=true"),
      ]);
      expect(unhandled.body.items.map((item: { id: string }) => item.id)).toEqual([second.id]);
      expect(done.body.items[0]).toMatchObject({ id: first.id, handledBy: { name: expect.any(String) } });
      expect(done.body.items[0].handledBy.id).toBe(handled.body.handledBy.id);
    });

    it("stays readable after a move to Essentiel", async () => {
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      expect((await listFeedback(ownerCookie)).body.items).toHaveLength(2);
    });

    it("is hidden from an Employee", async () => {
      expect((await listFeedback(employeeCookie)).status).toBe(403);
    });

    it("answers 404 for feedback of another Location", async () => {
      const response = await request(app.getHttpServer())
        .post(`/locations/${locationId}/feedback/999999999/handled`)
        .set("Cookie", ownerCookie);

      expect(response.status).toBe(404);
    });
  });
});
