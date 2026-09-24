// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { TrialReminderService } from "../src/billing/trial-reminder.service";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Trial reminders", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let ownerEmail: string;

  async function locationEndingIn(ms: number, name: string) {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Reminder Co",
        location: {
          name,
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@reminder.test",
          locale: "EN",
        },
      });
    const locationId = created.body.locations[0].id as string;
    await prisma.subscription.update({ where: { locationId }, data: { trialEndsAt: new Date(Date.now() + ms) } });
    return locationId;
  }
  const sentFor = (location: string) =>
    prisma.emailLog.findMany({ where: { to: ownerEmail, type: "trial_ending", subject: { contains: location } } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerEmail = `delivered+trial-reminder-${Date.now()}@resend.dev`;
    ownerCookie = await signInViaOtp(app, prisma, ownerEmail);
    await prisma.user.update({ where: { email: ownerEmail }, data: { locale: "FR" } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("emails the owner once, in their language, three days before the trial ends", async () => {
    const locationId = await locationEndingIn(2.5 * DAY_MS, "Atelier Soon");

    await app.get(TrialReminderService).sweep();
    await app.get(TrialReminderService).sweep();

    const sent = await sentFor("Atelier Soon");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Votre essai ReadyYet pour Atelier Soon se termine dans 3 jours");
    expect(sent[0].html).toContain(`/locations/${locationId}/billing`);
  });

  it("leaves trials further out, and ones already over, alone", async () => {
    await locationEndingIn(5 * DAY_MS, "Atelier Later");
    await locationEndingIn(-DAY_MS, "Atelier Past");

    await app.get(TrialReminderService).sweep();

    expect(await sentFor("Atelier Later")).toHaveLength(0);
    expect(await sentFor("Atelier Past")).toHaveLength(0);
  });

  it("doesn't remind a location that already chose a plan", async () => {
    const locationId = await locationEndingIn(2 * DAY_MS, "Atelier Paid");
    await prisma.subscription.update({ where: { locationId }, data: { status: "ACTIVE" } });

    await app.get(TrialReminderService).sweep();

    expect(await sentFor("Atelier Paid")).toHaveLength(0);
  });
});
