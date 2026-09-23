// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Invitations", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let employeeEmail: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+invite-owner-${stamp}@resend.dev`);
    employeeEmail = `delivered+invite-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
    otherCookie = await signInViaOtp(app, prisma, `delivered+invite-other-${stamp}@resend.dev`);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Invite Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+12125550123",
          contactEmail: "shop@invitetest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("invites a signed-up user by email as EMPLOYEE", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("PENDING");
    expect(response.body.email).toBe(employeeEmail);
  });

  it("rejects a second pending invite to the same email at the same location", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects an EMPLOYEE (non-owner/admin) from inviting", async () => {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", employeeCookie)
      .send({ email: "delivered+someone-else@resend.dev", role: "EMPLOYEE" });

    expect(response.status).toBe(403);
  });

  it("lists pending invitations for the location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.some((i: { email: string }) => i.email === employeeEmail)).toBe(true);
  });

  it("rejects accepting with a mismatched signed-in user", async () => {
    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie);
    const invitationId = list.body.find((i: { email: string }) => i.email === employeeEmail).id;

    const response = await request(app.getHttpServer())
      .post(`/invitations/${invitationId}/accept`)
      .set("Cookie", otherCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("lets the invited user accept, creating a real membership", async () => {
    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie);
    const invitationId = list.body.find((i: { email: string }) => i.email === employeeEmail).id;

    const accept = await request(app.getHttpServer())
      .post(`/invitations/${invitationId}/accept`)
      .set("Cookie", employeeCookie);
    expect(accept.status).toBe(201);
    expect(accept.body.role).toBe("EMPLOYEE");

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", employeeCookie);
    expect(me.body.memberships).toHaveLength(1);
    expect(me.body.memberships[0].role).toBe("EMPLOYEE");
    expect(me.body.memberships[0].location.id).toBe(locationId);
  });

  it("rejects accepting an already-accepted invitation again", async () => {
    const list = await request(app.getHttpServer())
      .get(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie);
    const invitationId = list.body.find((i: { email: string }) => i.email === employeeEmail).id;

    const response = await request(app.getHttpServer())
      .post(`/invitations/${invitationId}/accept`)
      .set("Cookie", employeeCookie);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("revokes a pending invitation, blocking a later accept", async () => {
    const revokeeEmail = `delivered+invite-revokee-${Date.now()}@resend.dev`;
    const revokeeCookie = await signInViaOtp(app, prisma, revokeeEmail);

    const created = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: revokeeEmail, role: "ADMIN" });
    const invitationId = created.body.id;

    const revoked = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations/${invitationId}/revoke`)
      .set("Cookie", ownerCookie);
    expect(revoked.status).toBe(201);
    expect(revoked.body.status).toBe("REVOKED");

    const accept = await request(app.getHttpServer())
      .post(`/invitations/${invitationId}/accept`)
      .set("Cookie", revokeeCookie);
    expect(accept.status).toBe(409);
  });

  it("returns 404, not a raw DB error, for a malformed invitation id", async () => {
    const response = await request(app.getHttpServer())
      .post("/locations/" + locationId + "/invitations/not-a-uuid/revoke")
      .set("Cookie", ownerCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
