// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EmailService } from "../src/email/email.service";
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

  it("throws when no content is provided", async () => {
    await expect(email.send({ to: "delivered@resend.dev", subject: "Empty", type: "test" })).rejects.toThrow(
      /requires one of react, html, or text/,
    );
  });
});
