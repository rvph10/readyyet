// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { imageFile } from "./support/images";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0018: an account is anonymised, not deleted.
describe("Deleting your account", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+account-deletion-${stamp}-${label}@resend.dev`;

  async function member(label: string, role: Role = Role.EMPLOYEE) {
    const cookie = await signInViaOtp(app, prisma, address(label));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: address(label) } });
    await prisma.membership.create({ data: { userId: user.id, locationId, role } });
    return { cookie, id: user.id };
  }

  function deleteAccount(cookie: string) {
    return request(app.getHttpServer()).delete("/me").set("Cookie", cookie);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, address("owner"));
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Deletion Test",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "shop@deletiontest.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("removes who they were and all their access, but keeps the history that points at them", async () => {
    const { cookie, id } = await member("employee");
    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send({ title: "Brake pads", customer: { fullName: "Chloé Dubois" } });

    expect((await deleteAccount(cookie)).status).toBe(204);

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user).toMatchObject({ name: "Former member", email: `deleted-${id}@deleted.invalid` });
    expect(user.deletedAt).not.toBeNull();
    expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
    expect(await prisma.membership.count({ where: { userId: id } })).toBe(0);
    expect((await request(app.getHttpServer()).get("/me").set("Cookie", cookie)).status).toBe(401);
    const kept = await prisma.ticket.findUniqueOrThrow({ where: { id: BigInt(ticket.body.id) } });
    expect(kept.createdBy).toBe(id);
  });

  it("deletes their avatar, but keeps the photos they added to Tickets (ADR 0026)", async () => {
    const { cookie } = await member("pictures");
    const { body: me } = await request(app.getHttpServer())
      .put("/me/avatar")
      .set("Cookie", cookie)
      .attach("file", await imageFile("png"), "me.png");
    const ticket = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", cookie)
      .send({ title: "Rear bumper", customer: { fullName: "Chloé Dubois" } });
    const { body: photo } = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets/${ticket.body.id}/photos`)
      .set("Cookie", cookie)
      .attach("file", await imageFile("jpeg"), "bumper.jpg");

    expect((await deleteAccount(cookie)).status).toBe(204);

    expect((await request(app.getHttpServer()).get(new URL(me.avatarUrl).pathname)).status).toBe(404);
    expect(await prisma.ticketPhoto.count({ where: { id: BigInt(photo.id) } })).toBe(1);
    expect((await fetch(photo.url)).status).toBe(200);
  });

  it("confirms it to the address the account had, with replies going to support", async () => {
    const { cookie } = await member("confirmed");

    await deleteAccount(cookie);

    const log = await prisma.emailLog.findFirstOrThrow({
      where: { to: address("confirmed"), type: "account_deleted" },
    });
    expect(log).toMatchObject({ subject: "Your ReadyYet account was deleted", replyTo: process.env.SUPPORT_EMAIL });
    expect(log.text).toContain(address("confirmed"));
  });

  it("lets the same address sign up again, as a new and empty account", async () => {
    const { cookie, id } = await member("returning");
    await deleteAccount(cookie);

    const newCookie = await signInViaOtp(app, prisma, address("returning"));

    const me = await request(app.getHttpServer()).get("/me").set("Cookie", newCookie);
    expect(me.body.id).not.toBe(id);
    expect(me.body.memberships).toEqual([]);
  });

  it("asks for a fresh sign-in when the last one is more than 10 minutes old", async () => {
    const { cookie, id } = await member("stale");
    await prisma.session.updateMany({
      where: { userId: id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    const response = await deleteAccount(cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("REAUTHENTICATION_REQUIRED");
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });

  it("refuses an owner whose business still has a location, until it's gone", async () => {
    const response = await deleteAccount(ownerCookie);

    expect(response.status).toBe(409);

    await request(app.getHttpServer()).delete(`/locations/${locationId}`).set("Cookie", ownerCookie);
    expect((await deleteAccount(ownerCookie)).status).toBe(204);
  });
});

describe("Invitations sent by a deleted account", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("stay valid, and a resend's replies go to the shop instead", async () => {
    const stamp = Date.now();
    const ownerCookie = await signInViaOtp(app, prisma, `delivered+deleted-inviter-owner-${stamp}@resend.dev`);
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Inviter Test",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "shop@invitertest.test",
          locale: "EN",
        },
      });
    const locationId = created.body.locations[0].id as string;
    const adminEmail = `delivered+deleted-inviter-admin-${stamp}@resend.dev`;
    const adminCookie = await signInViaOtp(app, prisma, adminEmail);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    await prisma.membership.create({ data: { userId: admin.id, locationId, role: Role.ADMIN } });
    const inviteeEmail = `delivered+deleted-inviter-invitee-${stamp}@resend.dev`;
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", adminCookie)
      .send({ email: inviteeEmail, role: "EMPLOYEE" });

    await request(app.getHttpServer()).delete("/me").set("Cookie", adminCookie);
    const resent = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations/${invitation.body.id}/resend`)
      .set("Cookie", ownerCookie);

    expect(resent.status).toBe(200);
    expect(resent.body.status).toBe("PENDING");
    const logs = await vi.waitFor(async () => {
      const found = await prisma.emailLog.findMany({
        where: { to: inviteeEmail, type: "invitation", status: "SENT" },
        orderBy: { createdAt: "asc" },
      });
      expect(found).toHaveLength(2);
      return found;
    });
    expect(logs[1]).toMatchObject({
      replyTo: "shop@invitertest.test",
      subject: "Former member invited you to join Shop on ReadyYet",
    });
  });
});
