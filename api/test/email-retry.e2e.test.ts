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

  it("retries with the same display name, Reply-To and headers as the original send", async () => {
    const stuck = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry sender test",
        html: "<p>Should keep its sender.</p>",
        fromName: "Retry Shop via ReadyYet",
        replyTo: "retry@shop.test",
        headers: { "List-Unsubscribe": "<https://api.readyyet.test/stop>" },
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

  it("gives up on an email failing for over a day, without sending it", async () => {
    const old = await prisma.emailLog.create({
      data: {
        to: "delivered@resend.dev",
        subject: "readyyet retry give up test",
        html: "<p>Too late to send.</p>",
        type: "test",
        status: EmailStatus.FAILED,
        attempts: 50,
        lastError: "simulated failure",
        lastAttemptAt: new Date(Date.now() - 3 * 60 * 60_000),
        createdAt: new Date(Date.now() - 25 * 60 * 60_000),
      },
    });

    await retry.sweep();

    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: old.id } });
    expect(after.gaveUpAt).toBeTruthy();
    expect(after.status).toBe("FAILED");
    expect(after.attempts).toBe(50);
  });

  it("gives up at once on an error that can't succeed, and no sweep tries it again", async () => {
    sent.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "bad address", statusCode: 422 },
      headers: null,
    });

    const log = await app.get(EmailService).send({
      to: "delivered@resend.dev",
      subject: "readyyet give up at once test",
      html: "<p>Refused.</p>",
      type: "test",
    });
    expect(log.status).toBe("FAILED");
    const stored = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(stored.gaveUpAt).toBeTruthy();

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { lastAttemptAt: new Date(Date.now() - 60 * 60_000) },
    });
    await retry.sweep();
    const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(after.attempts).toBe(1);
  });
});
