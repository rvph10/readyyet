// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Memberships", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let employeeEmail: string;
  let locationId: string;
  let ownerMembershipId: string;
  let employeeMembershipId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `membership-owner-${stamp}@readyyet.test`);
    employeeEmail = `membership-employee-${stamp}@readyyet.test`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Membership Test Garage",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@membershiptest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;

    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", employeeCookie);

    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/memberships`)
      .set("Cookie", ownerCookie);
    ownerMembershipId = list.body.find((m: { role: string }) => m.role === "OWNER").id;
    employeeMembershipId = list.body.find((m: { role: string }) => m.role === "EMPLOYEE").id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists members with user info", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/memberships`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.find((m: { role: string }) => m.role === "EMPLOYEE").user.email).toBe(employeeEmail);
  });

  it("rejects an EMPLOYEE managing memberships", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/memberships`)
      .set("Cookie", employeeCookie);

    expect(response.status).toBe(403);
  });

  it("promotes an employee to admin", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/memberships/${employeeMembershipId}`)
      .set("Cookie", ownerCookie)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("ADMIN");
  });

  it("rejects setting a role to OWNER", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/memberships/${employeeMembershipId}`)
      .set("Cookie", ownerCookie)
      .send({ role: "OWNER" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects changing the owner's own membership", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/locations/${locationId}/memberships/${ownerMembershipId}`)
      .set("Cookie", ownerCookie)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects removing the owner's own membership", async () => {
    const response = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/memberships/${ownerMembershipId}`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("removes a member, revoking their access", async () => {
    const removed = await request(app.getHttpServer())
      .delete(`/locations/${locationId}/memberships/${employeeMembershipId}`)
      .set("Cookie", ownerCookie);
    expect(removed.status).toBe(204);

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", employeeCookie);
    expect(me.body.memberships).toHaveLength(0);

    const location = await request(app.getHttpServer()).get(`/locations/${locationId}`).set("Cookie", employeeCookie);
    expect(location.status).toBe(403);
  });
});
