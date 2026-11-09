// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { EmailStatus } from "@readyyet/db";
import { EmailRetryService } from "../src/email/email-retry.service";
import { EmailService } from "../src/email/email.service";
import { getResendClient } from "../src/email/resend-client";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";

describe("EmailRetryService", () => {
  let app: INestApplication;
  let retry: EmailRetryService;
  let prisma: PrismaService;

  const sent = vi.spyOn(getResendClient().emails, "send");

  beforeAll(async () => {
    app = await createTestApp();
    retry = app.get(EmailRetryService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("retries a FAILED row past its cooldown and updates it to SENT", async () => {
    const stuck = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry sweep test",
        html: "<p>Should be retried by the sweep.</p>",
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 1,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 5 * 60_000),
      },
    });

    await retry.sweep();

    const updated = await prisma.emailLog.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.resendId).toBeTruthy();
    expect(updated.attempts).toBeGreaterThan(1);
  });

  it("retries with the same display name, Reply-To, headers and attachments as the original send", async () => {
    const stuck = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry sender test",
        html: "<p>Should keep its sender.</p>",
        fromName: "Retry Shop via ReadyYet",
        replyTo: "retry@shop.test",
        headers: { "List-Unsubscribe": "<https://api.readyyet.test/stop>" },
        attachments: [{ filename: "ready-date.ics", content: "QkVHSU46VkNBTEVOREFS", contentType: "text/calendar" }],
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 1,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 5 * 60_000),
      },
    });

    await retry.sweep();

    const updated = await prisma.emailLog.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(updated.status).toBe("SENT");
    // Checked on what the SDK was handed, see the same spy in email.e2e.test.ts.
    const call = sent.mock.calls.find(([message]) => message.subject === "readyyet retry sender test");
    expect(call![0]).toMatchObject({
      from: expect.stringMatching(/^"Retry Shop via ReadyYet" </),
      replyTo: "retry@shop.test",
      headers: { "List-Unsubscribe": "<https://api.readyyet.test/stop>" },
      attachments: [{ filename: "ready-date.ics", content: "QkVHSU46VkNBTEVOREFS", contentType: "text/calendar" }],
    });
  });

  it("does not retry a sign-in code, it would arrive expired", async () => {
    const stuck = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry sign-in code test",
        html: "<p>Should not be retried.</p>",
        type: "auth_otp",
        status: EmailStatus.FAILED,
        attempts: 1,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 5 * 60_000),
      },
    });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(after.status).toBe("FAILED");
    expect(after.attempts).toBe(1);
  });

  it("does not retry a FAILED row still inside its cooldown window", async () => {
    const recent = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry cooldown test",
        html: "<p>Should not be retried yet.</p>",
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 1,
        lastError: "simulated failure",
        lastAttemptAt: new Date(),
      },
    });

    await retry.sweep();

    const unchanged = await prisma.emailLog.findUniqueOrThrow({ where: { id: recent.id } });
    expect(unchanged.status).toBe("FAILED");
    expect(unchanged.attempts).toBe(1);
  });

  it("waits longer after each round of attempts", async () => {
    const backingOff = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry backoff test",
        html: "<p>Should wait for its next round.</p>",
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 12,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 5 * 60_000),
      },
    });

    await retry.sweep();

    const unchanged = await prisma.emailLog.findUniqueOrThrow({ where: { id: backingOff.id } });
    expect(unchanged.attempts).toBe(12);
    await prisma.emailLog.delete({ where: { id: backingOff.id } });
  });

  const failedEmail = (subject: string, data: object = {}) =>
    prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject,
        html: "<p>Test.</p>",
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 3,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 60 * 60_000),
        ...data,
      },
    });
  const HOUR = 60 * 60_000;

  it("gives an email past its day one last try, whatever the backoff says", async () => {
    const old = await failedEmail("readyyet retry last try test", {
      attempts: 50,
      createdAt: new Date(Date.now() - 25 * HOUR),
      lastAttemptAt: new Date(Date.now() - 2 * HOUR),
    });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: old.id } });
    expect(after.status).toBe("SENT");
    expect(after.gaveUpAt).toBeNull();
  });

  it("gives up once that last try has failed too, without sending it again", async () => {
    const old = await failedEmail("readyyet retry give up test", {
      attempts: 50,
      createdAt: new Date(Date.now() - 25 * HOUR),
      lastAttemptAt: new Date(Date.now() - 30 * 60_000),
    });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: old.id } });
    expect(after.gaveUpAt).toBeTruthy();
    expect(after.attempts).toBe(50);
  });

  it("keeps retrying an email Resend refused, as the cause can be our own setup", async () => {
    sent.mockResolvedValueOnce({
      data: null,
      error: { name: "invalid_api_key", message: "API key is invalid", statusCode: 403 },
      headers: null,
    });

    const log = (await app.get(EmailService).send({
      to: "delivered@resend.dev",
      subject: "readyyet refused test",
      html: "<p>Refused.</p>",
      type: "test",
    }))!;
    expect(log.status).toBe("FAILED");
    expect(log.attempts).toBe(1);
    expect(log.gaveUpAt).toBeNull();

    await prisma.emailLog.update({ where: { id: log.id }, data: { lastAttemptAt: new Date(Date.now() - HOUR) } });
    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(after.status).toBe("SENT");
  });

  it("gives up on an email Resend took and later reported failed, a resend would only replay its answer", async () => {
    const failed = await failedEmail("readyyet webhook failed test", { resendId: `test-${Date.now()}` });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: failed.id } });
    expect(after.gaveUpAt).toBeTruthy();
    expect(after.status).toBe("FAILED");
  });

  it("waits a minute before retrying a row whose first send may still be running", async () => {
    const fresh = await prisma.emailLog.create({
      data: { to: "delivered@resend.dev", subject: "readyyet in flight test", html: "<p>Test.</p>", type: "test" },
    });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: fresh.id } });
    expect(after.status).toBe("QUEUED");
    expect(after.attempts).toBe(0);
    await prisma.emailLog.delete({ where: { id: fresh.id } });
  });
});
