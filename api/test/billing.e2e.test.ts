// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("GET /locations/:locationId/billing", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+billing-owner-${stamp}@resend.dev`);
    const employeeEmail = `delivered+billing-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Billing Co",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "main@billing.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", employeeCookie);
  });

  afterAll(async () => {
    await app.close();
  });

  it("shows the owner a Pro trial, not frozen and unlimited", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "TRIAL",
      plan: "PRO",
      interval: null,
      frozen: false,
      memberLimit: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("is frozen once the trial is over", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { trialEndsAt: new Date(Date.now() - 1000) } });

    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);

    expect(response.body).toMatchObject({ status: "TRIAL", frozen: true });
  });

  it("holds Essentiel to 2 members, and so does a move to it waiting for the period end", async () => {
    await prisma.subscription.update({
      where: { locationId },
      data: { status: "ACTIVE", plan: "ESSENTIEL", interval: "MONTH", currentPeriodEnd: new Date(Date.now() + 1e9) },
    });
    const essentiel = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);
    expect(essentiel.body).toMatchObject({ plan: "ESSENTIEL", frozen: false, memberLimit: 2 });

    await prisma.subscription.update({ where: { locationId }, data: { plan: "PRO", scheduledPlan: "ESSENTIEL" } });
    const scheduled = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", ownerCookie);
    expect(scheduled.body).toMatchObject({ plan: "PRO", scheduledPlan: "ESSENTIEL", memberLimit: 2 });
  });

  it("is kept from employees", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/billing`)
      .set("Cookie", employeeCookie);

    expect(response.status).toBe(403);
  });
});
