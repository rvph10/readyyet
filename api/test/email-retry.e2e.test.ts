// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EmailStatus } from "@readyyet/db";
import { EmailRetryService } from "../src/email/email-retry.service";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";

describe("EmailRetryService", () => {
  let app: INestApplication;
  let retry: EmailRetryService;
  let prisma: PrismaService;

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
});
