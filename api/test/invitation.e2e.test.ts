// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

  it("emails the invitation as the location, naming who sent it, with replies going to them", async () => {
    const email = `delivered+invite-email-${Date.now()}@resend.dev`;
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role: "ADMIN" });

    // Sent after the response.
    const log = await vi.waitFor(() =>
      prisma.emailLog.findFirstOrThrow({ where: { to: email, type: "invitation", status: "SENT" } }),
    );
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: invitation.body.invitedBy } });
    expect(log).toMatchObject({
      subject: "Test User invited you to join Main Shop on ReadyYet",
      fromName: "Main Shop via ReadyYet",
      replyTo: owner.email,
    });
    expect(log.text).toContain("Main Shop (Invite Test Garage) as an admin");
    expect(log.html).toContain(`${process.env.WEB_URL}/invitations/${invitation.body.id}`);
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

  describe("resending", () => {
    const address = (label: string) => `delivered+invite-resend-${Date.now()}-${label}@resend.dev`;

    function invite(email: string) {
      return request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie)
        .send({ email, role: "EMPLOYEE" });
    }

    function resend(invitationId: string) {
      return request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations/${invitationId}/resend`)
        .set("Cookie", ownerCookie);
    }

    function lapse(invitationId: string) {
      return prisma.invitation.update({
        where: { id: invitationId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
    }

    it("emails a pending invitation again and gives it a fresh 7 days", async () => {
      const email = address("pending");
      const invitation = await invite(email);
      await prisma.invitation.update({
        where: { id: invitation.body.id },
        data: { expiresAt: new Date(Date.now() + 60_000) },
      });

      const response = await resend(invitation.body.id);

      expect(response.status).toBe(200);
      const expiresIn = new Date(response.body.expiresAt).getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60_000);
      // The email is sent after the response, like the first one.
      await vi.waitFor(async () => expect(await prisma.emailLog.count({ where: { to: email } })).toBe(2));
    });

    it("refuses a revoked or lapsed invitation", async () => {
      const revoked = await invite(address("revoked"));
      await request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations/${revoked.body.id}/revoke`)
        .set("Cookie", ownerCookie);
      const lapsed = await invite(address("lapsed"));
      await lapse(lapsed.body.id);

      expect((await resend(revoked.body.id)).status).toBe(409);
      expect((await resend(lapsed.body.id)).status).toBe(409);
    });

    it("lets staff invite the same email again once an invitation lapsed", async () => {
      const email = address("reinvite");
      const first = await invite(email);
      await lapse(first.body.id);

      const second = await invite(email.toUpperCase());

      expect(second.status).toBe(201);
      const stale = await prisma.invitation.findUniqueOrThrow({ where: { id: first.body.id } });
      expect(stale.status).toBe("EXPIRED");
    });

    it("returns 404 for an invitation that isn't in this location", async () => {
      expect((await resend("00000000-0000-0000-0000-000000000000")).status).toBe(404);
      expect((await resend("not-a-uuid")).status).toBe(404);
    });
  });
});
