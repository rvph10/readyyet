// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { EmailRetryService } from "../src/email/email-retry.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Invitations", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let employeeCookie: string;
  let employeeEmail: string;
  let otherEmail: string;
  let otherCookie: string;
  let locationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    ownerCookie = await signInViaOtp(app, prisma, `delivered+invite-owner-${stamp}@resend.dev`);
    employeeEmail = `delivered+invite-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
    otherEmail = `delivered+invite-other-${stamp}@resend.dev`;
    otherCookie = await signInViaOtp(app, prisma, otherEmail);

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Invite Test Garage",
        location: {
          name: "Main Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
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
    const log = await vi.waitFor(
      () => prisma.emailLog.findFirstOrThrow({ where: { to: email, type: "invitation", status: "SENT" } }),
      { timeout: 10_000, interval: 200 },
    );
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: invitation.body.invitedBy.id } });
    expect(invitation.body.invitedBy).toEqual({ id: owner.id, name: owner.name });
    expect(log).toMatchObject({
      subject: "Test User invited you to join Main Shop on ReadyYet",
      fromName: "Main Shop via ReadyYet",
      replyTo: owner.email,
    });
    expect(log.text).toContain("Main Shop (Invite Test Garage) as an admin");
    expect(log.html).toContain(`${process.env.WEB_URL}/invitations/${invitation.body.id}`);
  });

  it("writes to someone who already has an account in their own language", async () => {
    const email = `delivered+invite-french-user-${Date.now()}@resend.dev`;
    await signInViaOtp(app, prisma, email);
    await prisma.user.update({ where: { email }, data: { locale: "FR" } });

    await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email, role: "EMPLOYEE" });

    const log = await vi.waitFor(
      () => prisma.emailLog.findFirstOrThrow({ where: { to: email, type: "invitation", status: "SENT" } }),
      { timeout: 10_000, interval: 200 },
    );
    expect(log.subject).toBe("Test User vous invite à rejoindre Main Shop sur ReadyYet");
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

  describe("reading an invitation before accepting it", () => {
    async function pendingInvitationId() {
      const list = await request(app.getHttpServer())
        .get(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie);
      return list.body.find((i: { email: string }) => i.email === employeeEmail).id as string;
    }

    it("shows the invited user who invited them, where, as what, and the team they'd join", async () => {
      const response = await request(app.getHttpServer())
        .get(`/invitations/${await pendingInvitationId()}`)
        .set("Cookie", employeeCookie);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: employeeEmail,
        role: "EMPLOYEE",
        status: "PENDING",
        invitedBy: { name: "Test User" },
        location: { id: locationId, name: "Main Shop", business: { name: "Invite Test Garage", logoUrl: null } },
        team: [{ name: "Test User", avatarUrl: null }],
      });
      expect(Date.parse(response.body.createdAt)).not.toBeNaN();
    });

    it("shows a signed-out visitor who invites which address, but not the team", async () => {
      const response = await request(app.getHttpServer()).get(`/invitations/${await pendingInvitationId()}/preview`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: employeeEmail,
        status: "PENDING",
        invitedBy: { name: "Test User" },
        location: { name: "Main Shop", business: { name: "Invite Test Garage" } },
      });
      expect(response.body).not.toHaveProperty("team");
    });

    async function invite(email: string) {
      const response = await request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie)
        .send({ email, role: "EMPLOYEE" });
      expect(response.status).toBe(201);
      return response.body.id as string;
    }

    function revoke(invitationId: string) {
      return request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations/${invitationId}/revoke`)
        .set("Cookie", ownerCookie)
        .expect(200);
    }

    it("stops showing the team once the invitation is revoked", async () => {
      const email = `delivered+invite-revoked-${Date.now()}@resend.dev`;
      const cookie = await signInViaOtp(app, prisma, email);
      const id = await invite(email);
      await revoke(id);

      const response = await request(app.getHttpServer()).get(`/invitations/${id}`).set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "REVOKED", team: [] });
    });

    it("shows nothing of a deleted Location, signed in or not", async () => {
      const id = await invite(`delivered+invite-deleted-${Date.now()}@resend.dev`);
      await prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } });

      const response = await request(app.getHttpServer()).get(`/invitations/${id}/preview`);
      await prisma.location.update({ where: { id: locationId }, data: { deletedAt: null } });

      expect(response.status).toBe(404);
      await revoke(id);
    });

    it("drops a failed invitation email once the invitation is revoked", async () => {
      const email = `delivered+invite-late-${Date.now()}@resend.dev`;
      const id = await invite(email);
      // Once its send is over, or the send would mark it SENT after this does.
      const log = await vi.waitFor(
        () => prisma.emailLog.findFirstOrThrow({ where: { invitationId: id, status: "SENT" } }),
        { timeout: 10_000, interval: 200 },
      );
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "FAILED", resendId: null, attempts: 3, lastAttemptAt: new Date(Date.now() - 60 * 60_000) },
      });
      await revoke(id);

      await app.get(EmailRetryService).sweep();

      const after = await prisma.emailLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(after.gaveUpAt).toBeTruthy();
      expect(after.attempts).toBe(3);
    });

    it("previews nothing for an unknown or malformed id", async () => {
      for (const id of ["00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
        expect((await request(app.getHttpServer()).get(`/invitations/${id}/preview`)).status).toBe(404);
      }
    });

    it("hides it from any other signed-in user", async () => {
      const response = await request(app.getHttpServer())
        .get(`/invitations/${await pendingInvitationId()}`)
        .set("Cookie", otherCookie);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("says a lapsed invitation expired, even before anyone tried to accept it", async () => {
      const invited = await request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie)
        .send({ email: otherEmail, role: "EMPLOYEE" });
      await prisma.invitation.update({
        where: { id: invited.body.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app.getHttpServer())
        .get(`/invitations/${invited.body.id}`)
        .set("Cookie", otherCookie);

      expect(response.body.status).toBe("EXPIRED");
    });

    it("returns 404 for an unknown or malformed id", async () => {
      for (const id of ["00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
        const response = await request(app.getHttpServer()).get(`/invitations/${id}`).set("Cookie", employeeCookie);
        expect(response.status).toBe(404);
      }
    });
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

    // ADR 0127: the new member is welcomed, and whoever invited them told.
    const sent = (type: string) => prisma.emailLog.findMany({ where: { type, dedupeKey: `${type}:${invitationId}` } });
    // Both are sent at once, either can land first.
    await vi.waitFor(
      async () => {
        expect(await sent("member_joined")).toHaveLength(1);
        expect(await sent("joined_team")).toHaveLength(1);
      },
      { timeout: 10_000, interval: 200 },
    );
    const [joined] = await sent("joined_team");
    expect(joined.to).toBe(employeeEmail);
    const owner = await request(app.getHttpServer()).get("/me").set("Cookie", ownerCookie);
    expect((await sent("member_joined"))[0].to).toBe(owner.body.email);
  });

  it("doesn't tell an inviter who has left the Location that someone joined (ADR 0127)", async () => {
    const stamp = Date.now();
    const adminEmail = `delivered+invite-leaver-${stamp}@resend.dev`;
    const adminCookie = await signInViaOtp(app, prisma, adminEmail);
    const toAdmin = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: adminEmail, role: "ADMIN" });
    await request(app.getHttpServer()).post(`/invitations/${toAdmin.body.id}/accept`).set("Cookie", adminCookie);
    const newcomerEmail = `delivered+invite-newcomer-${stamp}@resend.dev`;
    const newcomerCookie = await signInViaOtp(app, prisma, newcomerEmail);
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", adminCookie)
      .send({ email: newcomerEmail, role: "EMPLOYEE" });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: adminEmail } });
    await prisma.membership.deleteMany({ where: { userId: admin.id, locationId } });

    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", newcomerCookie);

    const sent = (type: string) => prisma.emailLog.findMany({ where: { dedupeKey: `${type}:${invitation.body.id}` } });
    await vi.waitFor(async () => expect(await sent("joined_team")).toHaveLength(1), { timeout: 10_000, interval: 200 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await sent("member_joined")).toHaveLength(0);
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
    expect(revoked.status).toBe(200);
    expect(revoked.body.status).toBe("REVOKED");

    const accept = await request(app.getHttpServer())
      .post(`/invitations/${invitationId}/accept`)
      .set("Cookie", revokeeCookie);
    expect(accept.status).toBe(409);
  });

  describe("declining", () => {
    async function invite() {
      const email = `delivered+invite-decline-${Date.now()}@resend.dev`;
      const cookie = await signInViaOtp(app, prisma, email);
      const invited = await request(app.getHttpServer())
        .post(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie)
        .send({ email, role: "EMPLOYEE" });
      return { id: invited.body.id as string, cookie };
    }

    it("marks it declined for the Location's staff, and it can't be accepted after", async () => {
      const { id, cookie } = await invite();

      const response = await request(app.getHttpServer()).post(`/invitations/${id}/decline`).set("Cookie", cookie);

      expect(response.status).toBe(204);
      const list = await request(app.getHttpServer())
        .get(`/locations/${locationId}/invitations`)
        .set("Cookie", ownerCookie);
      expect(list.body.find((i: { id: string }) => i.id === id).status).toBe("DECLINED");
      const accept = await request(app.getHttpServer()).post(`/invitations/${id}/accept`).set("Cookie", cookie);
      expect(accept.status).toBe(409);
    });

    it("refuses declining twice", async () => {
      const { id, cookie } = await invite();
      await request(app.getHttpServer()).post(`/invitations/${id}/decline`).set("Cookie", cookie);

      const again = await request(app.getHttpServer()).post(`/invitations/${id}/decline`).set("Cookie", cookie);

      expect(again.status).toBe(409);
    });

    it("refuses anyone but the invited address", async () => {
      const { id } = await invite();

      const response = await request(app.getHttpServer()).post(`/invitations/${id}/decline`).set("Cookie", otherCookie);

      expect(response.status).toBe(403);
      expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    });
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
      await vi.waitFor(async () => expect(await prisma.emailLog.count({ where: { to: email } })).toBe(2), {
        timeout: 10_000,
        interval: 200,
      });
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
