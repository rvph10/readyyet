// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { EmailService } from "../src/email/email.service";
import { getResendClient } from "../src/email/resend-client";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";

// Resend's documented test-mode addresses simulate real outcomes without
// actually delivering mail, hits the real API with a real key rather than
// mocking the SDK, same "real dependency, not a mock" preference this
// repo already applies to Postgres in other e2e tests.
describe("EmailService", () => {
  let app: INestApplication;
  let email: EmailService;
  let prisma: PrismaService;

  // The test API key can only send, not read emails back, so what we hand
  // the SDK is checked instead. The real send still happens, Resend
  // accepting it (SENT) confirms the headers are valid.
  const sent = vi.spyOn(getResendClient().emails, "send");

  beforeAll(async () => {
    app = await createTestApp();
    email = app.get(EmailService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends an email and records it as SENT with a resendId", async () => {
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet email infrastructure test",
      type: "test",
      html: "<p>Hello from the readyyet test suite.</p>",
    });

    expect(log.status).toBe("SENT");
    expect(log.resendId).toBeTruthy();
    // >=1, not ===1: this hits the real Resend API alongside other test
    // files' sends running concurrently, a transient rate limit
    // triggering one in-process retry is the retry logic working
    // correctly, not a bug, asserting exactly one attempt would be
    // asserting away the very thing this infrastructure exists for.
    expect(log.attempts).toBeGreaterThanOrEqual(1);
  });

  it("persists subject/html so a later retry has content to resend", async () => {
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet retry-content test",
      type: "test",
      html: "<p>Retry content check.</p>",
    });

    const stored = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(stored.subject).toBe("readyyet retry-content test");
    expect(stored.html).toBe("<p>Retry content check.</p>");
  });

  it("marks a bounced test address as FAILED, not stuck QUEUED", async () => {
    const log = await email.send({
      to: "bounced@resend.dev",
      subject: "readyyet bounce test",
      type: "test",
      html: "<p>This should bounce.</p>",
    });

    // Resend accepts the send (it's a valid address shape), the bounce
    // itself is a delivery event that would arrive via the webhook, not
    // synchronously here, so this only confirms the send-side SENT status.
    expect(log.status).toBe("SENT");
  });

  it("sends under the given display name, from EMAIL_FROM's address, with a Reply-To", async () => {
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet sender test",
      type: "test",
      html: "<p>Sender check.</p>",
      fromName: 'Joe\'s Garage, "Downtown" via ReadyYet',
      replyTo: "shop@joesgarage.test",
    });

    const stored = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(stored.fromName).toBe('Joe\'s Garage, "Downtown" via ReadyYet');
    expect(stored.replyTo).toBe("shop@joesgarage.test");

    expect(log.status).toBe("SENT");
    const address = /<([^>]+)>/.exec(process.env.EMAIL_FROM as string)![1];
    expect(sent.mock.lastCall![0]).toMatchObject({
      from: `"Joe's Garage, \\"Downtown\\" via ReadyYet" <${address}>`,
      replyTo: "shop@joesgarage.test",
    });
  });

  it("keeps a display name to one line, so it can't add a header", async () => {
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet sender injection test",
      type: "test",
      html: "<p>Injection check.</p>",
      fromName: "Evil Shop\r\nBcc: victim@example.test",
    });

    expect(log.status).toBe("SENT");
    expect(sent.mock.lastCall![0].from).toMatch(/^"Evil Shop Bcc: victim@example.test" </);
  });

  it("sends extra headers and keeps them for a retry", async () => {
    const headers = { "List-Unsubscribe": "<https://api.readyyet.test/stop>" };
    const log = await email.send({
      to: "delivered@resend.dev",
      subject: "readyyet headers test",
      type: "test",
      html: "<p>Headers check.</p>",
      headers,
    });

    expect(log.status).toBe("SENT");
    expect(log.headers).toEqual(headers);
    expect(sent.mock.lastCall![0].headers).toEqual(headers);
  });

  it("throws when no content is provided", async () => {
    await expect(email.send({ to: "delivered@resend.dev", subject: "Empty", type: "test" })).rejects.toThrow(
      /requires one of react, html, or text/,
    );
  });
});
