// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Role } from "@readyyet/db";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("GET /locations/:locationId/workflow", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+workflow-owner-${stamp}@resend.dev`);
    otherCookie = await signInViaOtp(app, prisma, `delivered+workflow-other-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Workflow Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550123",
          contactEmail: "shop@workflowtest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the location's default workflow starting at RECEIVED", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.steps[0].position).toBe(1);
    expect(response.body.steps[0].status.code).toBe("RECEIVED");
    expect(response.body.steps.some((step: { status: { code: string } }) => step.status.code === "DIAGNOSING")).toBe(
      true,
    );
  });

  it("uses the location's custom workflow on Pro only, Essentiel falls back to the default", async () => {
    const statuses = await prisma.status.findMany({ where: { code: { in: ["RECEIVED", "READY", "COMPLETED"] } } });
    const id = (code: string) => statuses.find((status) => status.code === code)!.id;
    await prisma.workflow.create({
      data: {
        locationId,
        name: "Quick",
        steps: {
          create: [
            { position: 1, statusId: id("RECEIVED") },
            { position: 2, statusId: id("READY") },
            { position: 3, statusId: id("COMPLETED") },
          ],
        },
      },
    });
    const workflow = () =>
      request(app.getHttpServer()).get(`/locations/${locationId}/workflow`).set("Cookie", ownerCookie);

    expect((await workflow()).body.name).toBe("Quick");

    await prisma.subscription.update({ where: { locationId }, data: { status: "ACTIVE", plan: "ESSENTIEL" } });
    expect((await workflow()).body.name).not.toBe("Quick");
  });

  it("rejects a signed-in user with no membership at that location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
  });
});

describe("PUT and DELETE /locations/:locationId/workflow", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;

  const codes = (body: { steps: { position: number; status: { code: string } }[] }) =>
    body.steps.map((step) => `${step.position}:${step.status.code}`);

  function replace(statusCodes: unknown, cookie = ownerCookie) {
    return request(app.getHttpServer())
      .put(`/locations/${locationId}/workflow`)
      .set("Cookie", cookie)
      .send({ statusCodes });
  }

  async function createTicket() {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Gearbox", customer: { fullName: "Workflow Customer" } });
    return response.body.id as string;
  }

  function setStatus(ticketId: string, statusCode: string) {
    return request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticketId}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+workflow-edit-owner-${stamp}@resend.dev`);
    const employeeEmail = `delivered+workflow-edit-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Workflow Edit Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+12125550124",
          contactEmail: "shop@workflowedit.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
    await prisma.membership.create({ data: { userId: employee.id, locationId, role: Role.EMPLOYEE } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("places the system statuses around the operational ones", async () => {
    const response = await replace(["INSPECTING", "REPAIRING", "QUALITY_CHECK"]);

    expect(response.status).toBe(200);
    expect(codes(response.body)).toEqual([
      "1:RECEIVED",
      "2:INSPECTING",
      "3:REPAIRING",
      "4:QUALITY_CHECK",
      "5:READY",
      "6:COMPLETED",
      "7:CANCELLED",
      "8:REJECTED",
    ]);
    const active = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", ownerCookie);
    expect(active.body).toEqual(response.body);
  });

  it("accepts an empty list, received straight to ready", async () => {
    const response = await replace([]);

    expect(response.status).toBe(200);
    expect(codes(response.body)).toEqual(["1:RECEIVED", "2:READY", "3:COMPLETED", "4:CANCELLED", "5:REJECTED"]);
  });

  it("gives new tickets the new workflow while open ones keep theirs", async () => {
    await replace(["DIAGNOSING"]);
    const before = await createTicket();

    await replace(["QUALITY_CHECK"]);
    const after = await createTicket();

    expect((await setStatus(before, "DIAGNOSING")).status).toBe(200);
    expect((await setStatus(after, "DIAGNOSING")).status).toBe(400);
    expect((await setStatus(after, "QUALITY_CHECK")).status).toBe(200);
    expect(await prisma.workflow.count({ where: { locationId, isActive: true } })).toBe(1);
  });

  it("refuses system, unknown and duplicate status codes", async () => {
    expect((await replace(["READY"])).status).toBe(400);
    expect((await replace(["NOT_A_STATUS"])).status).toBe(400);
    expect((await replace(["REPAIRING", "REPAIRING"])).status).toBe(400);
    expect((await replace("REPAIRING")).status).toBe(400);
  });

  it("is for owners and admins only", async () => {
    expect((await replace(["REPAIRING"], employeeCookie)).status).toBe(403);
    const reset = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/workflow`)
      .set("Cookie", employeeCookie);
    expect(reset.status).toBe(403);
  });

  it("goes back to the business type's default workflow", async () => {
    await replace(["QUALITY_CHECK"]);

    const reset = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/workflow`)
      .set("Cookie", ownerCookie);
    expect(reset.status).toBe(204);

    const active = await request(app.getHttpServer())
      .get(`/locations/${locationId}/workflow`)
      .set("Cookie", ownerCookie);
    expect(active.body.name).not.toBe("Custom");
    expect(codes(active.body)).toContain("2:DIAGNOSING");
  });

  it("is refused on Essentiel with PLAN_REQUIRED", async () => {
    await prisma.subscription.update({ where: { locationId }, data: { status: "ACTIVE", plan: "ESSENTIEL" } });

    const response = await replace(["REPAIRING"]);

    expect(response.status).toBe(402);
    expect(response.body.error.code).toBe("PLAN_REQUIRED");
  });
});
