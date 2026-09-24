// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0017: only the Owner deletes a Location, a soft delete that's final.
describe("Deleting a location", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let adminCookie: string;
  let employeeCookie: string;
  let inviteeCookie: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+location-delete-${stamp}-${label}@resend.dev`;
  const userIds: Record<string, string> = {};

  // Each test gets its own Location, the only one of its own Business,
  // with the same signed-in Admin and Employee as members.
  async function createLocation() {
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Delete Test",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "shop@deletetest.test",
          locale: "EN",
        },
      });
    const locationId = created.body.locations[0].id as string;
    await prisma.membership.createMany({
      data: [
        { userId: userIds.admin, locationId, role: Role.ADMIN },
        { userId: userIds.employee, locationId, role: Role.EMPLOYEE },
      ],
    });
    return locationId;
  }

  function remove(locationId: string, cookie = ownerCookie) {
    return request(app.getHttpServer()).delete(`/locations/${locationId}`).set("Cookie", cookie);
  }

  function get(path: string, cookie: string) {
    return request(app.getHttpServer()).get(path).set("Cookie", cookie);
  }

  async function createTicket(locationId: string) {
    const response = await request(app.getHttpServer())
      .post(`/locations/${locationId}/tickets`)
      .set("Cookie", ownerCookie)
      .send({ title: "Clutch", customer: { fullName: "Chloé Dubois", email: address("customer") } });
    return response.body as { id: string; trackingCode: string };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const signIn = async (label: string) => {
      const cookie = await signInViaOtp(app, prisma, address(label));
      userIds[label] = (await prisma.user.findUniqueOrThrow({ where: { email: address(label) } })).id;
      return cookie;
    };
    ownerCookie = await signIn("owner");
    adminCookie = await signIn("admin");
    employeeCookie = await signIn("employee");
    inviteeCookie = await signIn("invitee");
  });

  afterAll(async () => {
    await app.close();
  });

  it("removes the location for every member, even the business's last one", async () => {
    const locationId = await createLocation();

    expect((await remove(locationId)).status).toBe(204);

    for (const cookie of [ownerCookie, adminCookie, employeeCookie]) {
      expect((await get(`/locations/${locationId}`, cookie)).status).toBe(404);
      expect((await get(`/locations/${locationId}/tickets`, cookie)).status).toBe(404);
      const me = await get("/me", cookie);
      expect(me.body.memberships.map((m: { location: { id: string } }) => m.location.id)).not.toContain(locationId);
    }
  });

  it("keeps its tickets, but their tracking links stop working", async () => {
    const locationId = await createLocation();
    const ticket = await createTicket(locationId);

    await remove(locationId);

    expect(await prisma.ticket.count({ where: { id: BigInt(ticket.id) } })).toBe(1);
    expect((await request(app.getHttpServer()).get(`/tracking/${ticket.trackingCode}`)).status).toBe(404);
  });

  it("drops status emails that were still waiting", async () => {
    const locationId = await createLocation();
    const ticket = await createTicket(locationId);
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}/tickets/${ticket.id}/status`)
      .set("Cookie", ownerCookie)
      .send({ statusCode: "READY" });

    await remove(locationId);

    expect(
      await prisma.pendingStatusNotification.count({ where: { statusEvent: { ticketId: BigInt(ticket.id) } } }),
    ).toBe(0);
  });

  it("revokes its pending invitations", async () => {
    const locationId = await createLocation();
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: address("invitee"), role: "EMPLOYEE" });

    await remove(locationId);

    const accepted = await request(app.getHttpServer())
      .post(`/invitations/${invitation.body.id}/accept`)
      .set("Cookie", inviteeCookie);
    expect(accepted.status).toBe(409);
    expect(await prisma.membership.count({ where: { userId: userIds.invitee, locationId } })).toBe(0);
  });

  it("is the owner's alone", async () => {
    const locationId = await createLocation();

    expect((await remove(locationId, adminCookie)).status).toBe(403);
    expect((await remove(locationId, employeeCookie)).status).toBe(403);
    expect((await get(`/locations/${locationId}`, ownerCookie)).status).toBe(200);
  });

  it("answers 404 once the location is already deleted", async () => {
    const locationId = await createLocation();
    await remove(locationId);

    expect((await remove(locationId)).status).toBe(404);
  });
});
