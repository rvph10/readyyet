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

// ADR 0027, ADR 0039, ADR 0125: a Pro Location emails "how did it go?" after
// COMPLETED, without the Google link. The review page takes stars, tags and
// a private message, and offers the link when the Location set one.
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

  // The routes are rate limited per client, each request its own address.
  function client() {
    const n = ++ipCounter;
    const ip = `100.64.${Math.floor(n / 250)}.${n % 250}`;
    const base = request(app.getHttpServer());
    return {
      get: (path: string) => base.get(path).set("X-Real-IP", ip),
      post: (path: string) => base.post(path).set("X-Real-IP", ip),
      patch: (path: string) => base.patch(path).set("X-Real-IP", ip),
      delete: (path: string) => base.delete(path).set("X-Real-IP", ip),
    };
  }

  async function createTicket(label: string, title = "Vidange", withEmail = true) {
    const response = await client()
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title, customer: { fullName: `Client ${label}`, ...(withEmail && { email: address(label) }) } });
    await app.get(NotificationService).sendDueTicketCreatedEmails();
    return response.body as { id: string; trackingCode: string; customer: { id: string } };
  }

  async function setStatus(ticketId: string, statusCode: string) {
    const response = await client()
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
    return client().patch(`/locations/${locationId}`).set("Cookie", ownerCookie).send(body);
  }

  function setSubscription(data: object) {
    return prisma.subscription.update({ where: { locationId }, data });
  }

  function sendFeedback(trackingCode: string, message?: unknown, rating: object = { stars: 4, tags: ["FRIENDLY"] }) {
    return client()
      .post(`/tracking/${trackingCode}/feedback`)
      .send({ ...rating, message });
  }

  function tapGoogle(trackingCode: string, rating: object = { stars: 5, tags: [] }) {
    return client().post(`/tracking/${trackingCode}/google-click`).send(rating);
  }

  function staffEmailsAbout(title: string) {
    return prisma.emailLog.findMany({ where: { type: "feedback_received", html: { contains: title } } });
  }

  function listFeedback(cookie: string, query = "") {
    return client().get(`/locations/${locationId}/feedback${query}`).set("Cookie", cookie);
  }

  async function join(email: string, role: "ADMIN" | "EMPLOYEE") {
    const cookie = await signInViaOtp(app, prisma, email);
    const invitation = await client()
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role });
    await client().post(`/invitations/${invitation.body.id}/accept`).set("Cookie", cookie);
    return cookie;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notification = app.get(NotificationService);
    ownerCookie = await signInViaOtp(app, prisma, address("owner"));

    const created = await client()
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
      // Names every object has, which a plain lookup by host would find.
      "https://constructor/",
      "https://__proto__/",
    ])("refuses %s", async (url) => {
      const response = await patchLocation({ googleReviewUrl: url });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("googleReviewUrl");
    });

    it.each(["https://evil.example/review", "https://constructor/"])("won't check %s", async (url) => {
      const response = await client()
        .post(`/locations/${locationId}/review-link/check`)
        .set("Cookie", ownerCookie)
        .send({ url });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].property).toBe("url");
    });

    it("won't check a link for an Employee", async () => {
      const response = await client()
        .post(`/locations/${locationId}/review-link/check`)
        .set("Cookie", employeeCookie)
        .send({ url: REVIEW_URL });

      expect(response.status).toBe(403);
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
      expect(email.html).toContain(`/t/${ticket.trackingCode}/review?stars=1`);
      expect(email.html).toContain(`/t/${ticket.trackingCode}/review?stars=5`);
      expect(email.html).not.toContain("g.page");
    });

    it("tells the Customer about it in the ticket-created email", async () => {
      await createTicket("notice");

      const [email] = await emailsTo("notice", "ticket_tracking_link");
      expect(email.html).toContain("you&#x27;ll get one email asking how it went");
    });

    it("says nothing about it at drop-off when the Location doesn't ask", async () => {
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      await createTicket("no-notice");

      const [email] = await emailsTo("no-notice", "ticket_tracking_link");
      expect(email.html).not.toContain("asking how it went");
    });

    it("sends nothing for an undone COMPLETED", async () => {
      const ticket = await createTicket("undone");
      await complete(ticket.id);
      await client().post(`/locations/${locationId}/tickets/${ticket.id}/status/undo`).set("Cookie", ownerCookie);

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

    it("asks even without a Google link", async () => {
      await prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: null } });
      const ticket = await createTicket("no-link");
      await complete(ticket.id);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("no-link", "ticket_feedback_request")).toHaveLength(1);
    });

    it.each([
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
      await client().post(`/tracking/${ticket.trackingCode}/stop-notifications`);

      await makeDueAndSweep(ticket.id);

      expect(await emailsTo("stopped", "ticket_feedback_request")).toHaveLength(0);
    });
  });

  describe("the tracking page", () => {
    it("offers the Google link only once the Ticket is COMPLETED", async () => {
      const ticket = await createTicket("page");
      await setStatus(ticket.id, "READY");
      const ready = await client().get(`/tracking/${ticket.trackingCode}`);
      await setStatus(ticket.id, "COMPLETED");

      const completed = await client().get(`/tracking/${ticket.trackingCode}`);

      expect(ready.body).toMatchObject({ asksForFeedback: false, reviewUrl: null });
      expect(completed.body).toMatchObject({ asksForFeedback: true, reviewUrl: REVIEW_URL, feedback: null });
    });

    it("takes feedback without a Google link, offering no Google choice", async () => {
      await prisma.location.update({ where: { id: locationId }, data: { googleReviewUrl: null } });
      const ticket = await createTicket("page-no-link");
      await complete(ticket.id);

      const response = await client().get(`/tracking/${ticket.trackingCode}`);

      expect(response.body).toMatchObject({ asksForFeedback: true, reviewUrl: null });
    });

    it("offers nothing on Essentiel", async () => {
      const ticket = await createTicket("page-essentiel");
      await complete(ticket.id);
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      const response = await client().get(`/tracking/${ticket.trackingCode}`);

      expect(response.body).toMatchObject({ asksForFeedback: false, reviewUrl: null });
    });
  });

  describe("private feedback", () => {
    it("takes the Customer's message once, and emails the Owner and Admins at once", async () => {
      const ticket = await createTicket("private", `Embrayage ${stamp}`);
      await complete(ticket.id);

      const response = await sendFeedback(ticket.trackingCode, "  The car still makes the noise.  ", {
        stars: 3,
        tags: ["NOT_FIXED", "FRIENDLY"],
      });

      expect(response.status).toBe(204);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored).toMatchObject({
        message: "The car still makes the noise.",
        stars: 3,
        tags: ["NOT_FIXED", "FRIENDLY"],
      });
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
      const tracking = await client().get(`/tracking/${ticket.trackingCode}`);
      expect(tracking.body.feedback).toEqual({ stars: 3, tags: ["NOT_FIXED", "FRIENDLY"], messageSent: true });

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
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

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
      ["a message over 2000 characters", "x".repeat(2001), undefined],
      ["a message that isn't text", 42, undefined],
      ["no stars", undefined, { tags: [] }],
      ["0 stars", undefined, { stars: 0, tags: [] }],
      ["6 stars", undefined, { stars: 6, tags: [] }],
      ["a tag that isn't on the list", undefined, { stars: 4, tags: ["CHEAP"] }],
      ["the same tag twice", undefined, { stars: 4, tags: ["FRIENDLY", "FRIENDLY"] }],
    ])("refuses %s", async (_, message, rating) => {
      const ticket = await createTicket(`invalid-${++ipCounter}`);
      await complete(ticket.id);

      expect((await sendFeedback(ticket.trackingCode, message, rating)).status).toBe(400);
    });

    it("takes a blank message as none", async () => {
      const ticket = await createTicket("blank");
      await complete(ticket.id);

      expect((await sendFeedback(ticket.trackingCode, "   ")).status).toBe(204);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored.message).toBeNull();
    });

    it("saves nothing when the page is only opened, as a mail scanner would", async () => {
      const ticket = await createTicket("scanned");
      await complete(ticket.id);

      await client().get(`/tracking/${ticket.trackingCode}`);

      expect(await prisma.ticketFeedback.count({ where: { ticketId: BigInt(ticket.id) } })).toBe(0);
    });

    it("lets stars and tags change until a message is sent", async () => {
      const ticket = await createTicket("change");
      await complete(ticket.id);

      await sendFeedback(ticket.trackingCode, undefined, { stars: 5, tags: ["ON_TIME"] });
      await sendFeedback(ticket.trackingCode, "Actually it was late", { stars: 3, tags: ["LATE"] });
      const after = await sendFeedback(ticket.trackingCode, undefined, { stars: 5, tags: [] });

      expect(after.status).toBe(409);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored).toMatchObject({ stars: 3, tags: ["LATE"], message: "Actually it was late" });
    });

    it("emails staff about a low rating with no message, and not about a good one", async () => {
      const low = await createTicket("low", `Low ${stamp}`);
      const good = await createTicket("good", `Good ${stamp}`);
      await complete(low.id);
      await complete(good.id);

      await sendFeedback(low.trackingCode, undefined, { stars: 2, tags: ["LATE"] });
      await sendFeedback(good.trackingCode, undefined, { stars: 5, tags: [] });

      await vi.waitFor(async () => expect(await staffEmailsAbout(`Low ${stamp}`)).toHaveLength(2), {
        timeout: 10_000,
        interval: 200,
      });
      const [email] = await staffEmailsAbout(`Low ${stamp}`);
      expect(email.subject).toBe("Client low gave Garage Martin 2 out of 5");
      expect(await staffEmailsAbout(`Good ${stamp}`)).toHaveLength(0);
    });

    it("is deleted when the Customer is erased", async () => {
      const ticket = await createTicket("erased");
      await complete(ticket.id);
      await sendFeedback(ticket.trackingCode, "Please forget me");

      await client().delete(`/locations/${locationId}/customers/${ticket.customer.id}`).set("Cookie", ownerCookie);

      expect(await prisma.ticketFeedback.count({ where: { ticketId: BigInt(ticket.id) } })).toBe(0);
    });
  });

  describe("the Google choice", () => {
    it("counts the tap and keeps the rating picked before it", async () => {
      const ticket = await createTicket("google");
      await complete(ticket.id);

      const response = await tapGoogle(ticket.trackingCode, { stars: 5, tags: ["QUALITY"] });

      expect(response.status).toBe(204);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored).toMatchObject({ stars: 5, tags: ["QUALITY"], message: null });
      expect(stored.googleClickedAt).not.toBeNull();
    });

    it("still counts after a message, changing nothing else", async () => {
      const ticket = await createTicket("google-after");
      await complete(ticket.id);
      await sendFeedback(ticket.trackingCode, "Lovely", { stars: 4, tags: [] });

      const response = await tapGoogle(ticket.trackingCode, { stars: 1, tags: [] });

      expect(response.status).toBe(204);
      const stored = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });
      expect(stored).toMatchObject({ stars: 4, message: "Lovely" });
      expect(stored.googleClickedAt).not.toBeNull();
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
      // A good rating with no message: an answer, but nothing to follow up.
      const quiet = await createTicket("list-quiet", "Ticket list-quiet");
      await complete(quiet.id);
      await sendFeedback(quiet.trackingCode, undefined, { stars: 5, tags: [] });
      const { body } = await listFeedback(ownerCookie, "?view=follow-up");
      [second, first] = body.items;
    });

    it("lists what needs a follow-up newest first, with its Ticket and Customer", async () => {
      const response = await listFeedback(ownerCookie, "?view=follow-up");

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { message: string }) => item.message)).toEqual([
        "Feedback list-b",
        "Feedback list-a",
      ]);
      expect(response.body.items[0]).toMatchObject({
        ticket: { title: "Ticket list-b" },
        customer: { fullName: "Client list-b" },
        stars: 4,
        tags: ["FRIENDLY"],
        needsFollowUp: true,
        handledAt: null,
        handledBy: null,
      });
    });

    it("lists every answer in the all view", async () => {
      const response = await listFeedback(ownerCookie, "?view=all");

      expect(response.body.items.map((item: { needsFollowUp: boolean }) => item.needsFollowUp)).toEqual([
        false,
        true,
        true,
      ]);
    });

    it("counts only what needs a follow-up in the overview", async () => {
      const response = await client().get(`/locations/${locationId}/tickets/overview`).set("Cookie", ownerCookie);

      expect(response.body.counts.unhandledFeedback).toBe(2);
    });

    it("sums up this month", async () => {
      const response = await client().get(`/locations/${locationId}/feedback/insights`).set("Cookie", ownerCookie);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        answers: 3,
        ratings: 3,
        average: 13 / 3,
        stars: [0, 0, 0, 2, 1],
        tags: [{ tag: "FRIENDLY", count: 2 }],
        messages: 2,
        google: 0,
      });
      expect(response.body.asked).toBeGreaterThanOrEqual(3);
    });
    it("pages through it", async () => {
      const page = await listFeedback(ownerCookie, "?view=follow-up&take=1");
      const next = await listFeedback(ownerCookie, "?view=follow-up&take=1&page=2");

      expect(page.body.items[0].id).toBe(second.id);
      expect(next.body.items[0].id).toBe(first.id);
      expect(next.body.total).toBe(2);
    });

    it("marks it handled, keeping who did it first", async () => {
      const handled = await client()
        .post(`/locations/${locationId}/feedback/${first.id}/handled`)
        .set("Cookie", adminCookie);
      await client().post(`/locations/${locationId}/feedback/${first.id}/handled`).set("Cookie", ownerCookie);

      expect(handled.status).toBe(200);
      const [followUp, all] = await Promise.all([
        listFeedback(ownerCookie, "?view=follow-up"),
        listFeedback(ownerCookie, "?view=all"),
      ]);
      expect(followUp.body.items.map((item: { id: string }) => item.id)).toEqual([second.id]);
      const done = all.body.items.find((item: { id: string }) => item.id === first.id);
      expect(done).toMatchObject({ needsFollowUp: false, handledBy: { name: expect.any(String) } });
      expect(done.handledBy.id).toBe(handled.body.handledBy.id);
    });

    it("emails a reply to the Customer in the shop's name, which handles it", async () => {
      const response = await client()
        .post(`/locations/${locationId}/feedback/${second.id}/reply`)
        .set("Cookie", adminCookie)
        .send({ reply: "  Sorry about that, come by and we'll look again.  " });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reply: "Sorry about that, come by and we'll look again.",
        needsFollowUp: false,
        handledBy: { name: expect.any(String) },
      });
      const [email] = await emailsTo("list-b", "feedback_reply");
      expect(email).toMatchObject({ subject: "Garage Martin replied to your message", replyTo: "atelier@martin.test" });
      expect(email.html).toContain("Sorry about that, come by and we&#x27;ll look again.");

      const again = await client()
        .post(`/locations/${locationId}/feedback/${second.id}/reply`)
        .set("Cookie", ownerCookie)
        .send({ reply: "Second reply" });
      expect(again.status).toBe(409);
      expect(await emailsTo("list-b", "feedback_reply")).toHaveLength(1);
    });

    it("can't reply to a Customer without an email address, and keeps nothing", async () => {
      const ticket = await createTicket("list-no-email", "Ticket list-no-email", false);
      await complete(ticket.id);
      await sendFeedback(ticket.trackingCode, "Call me", { stars: 1, tags: [] });
      const feedback = await prisma.ticketFeedback.findUniqueOrThrow({ where: { ticketId: BigInt(ticket.id) } });

      const response = await client()
        .post(`/locations/${locationId}/feedback/${feedback.id}/reply`)
        .set("Cookie", ownerCookie)
        .send({ reply: "Hello" });

      expect(response.status).toBe(409);
      expect(await prisma.ticketFeedback.findUniqueOrThrow({ where: { id: feedback.id } })).toMatchObject({
        reply: null,
        handledAt: null,
      });
      await prisma.ticketFeedback.delete({ where: { id: feedback.id } });
    });

    it("stays readable after a move to Essentiel", async () => {
      await setSubscription({ status: SubscriptionStatus.ACTIVE, plan: Plan.ESSENTIEL, trialEndsAt: null });

      expect((await listFeedback(ownerCookie)).body.items).toHaveLength(3);
    });

    it("is hidden from an Employee", async () => {
      expect((await listFeedback(employeeCookie)).status).toBe(403);
    });

    it("answers 404 for feedback of another Location", async () => {
      const response = await client()
        .post(`/locations/${locationId}/feedback/999999999/handled`)
        .set("Cookie", ownerCookie);

      expect(response.status).toBe(404);
    });
  });
});
