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

// ADR 0017: an Admin manages Employees only, Admins are the Owner's to manage.
describe("What an admin can do to the team", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let locationId: string;
  let ownerCookie: string;
  let adminCookie: string;
  const stamp = Date.now();
  const address = (label: string) => `delivered+team-${stamp}-${label}@resend.dev`;

  // A member added directly, the invitation flow is tested elsewhere.
  async function addMember(label: string, role: Role) {
    const cookie = await signInViaOtp(app, prisma, address(label));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: address(label) } });
    const membership = await prisma.membership.create({ data: { userId: user.id, locationId, role } });
    return { cookie, membershipId: membership.id.toString() };
  }

  function invite(cookie: string, label: string, role: string) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", cookie)
      .send({ email: address(label), role });
  }

  function revoke(cookie: string, invitationId: string) {
    return request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations/${invitationId}/revoke`)
      .set("Cookie", cookie);
  }

  function setRole(cookie: string, membershipId: string, role: string) {
    return request(app.getHttpServer())
      .patch(`/locations/${locationId}/memberships/${membershipId}`)
      .set("Cookie", cookie)
      .send({ role });
  }

  function remove(cookie: string, membershipId: string) {
    return request(app.getHttpServer())
      .delete(`/locations/${locationId}/memberships/${membershipId}`)
      .set("Cookie", cookie);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, address("owner"));

    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Team Limits Test",
        location: {
          name: "Shop",
          businessTypeCode: "GARAGE",
          contactPhone: "+32470123456",
          contactEmail: "shop@teamlimits.test",
          locale: "EN",
        },
      });
    locationId = created.body.locations[0].id;
    adminCookie = (await addMember("admin", Role.ADMIN)).cookie;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("invitations", () => {
    it("lets an admin invite an employee, but not an admin", async () => {
      expect((await invite(adminCookie, "invited-employee", "EMPLOYEE")).status).toBe(201);
      expect((await invite(adminCookie, "invited-admin", "ADMIN")).status).toBe(403);
    });

    it("lets an admin revoke an employee invitation, but not an admin one", async () => {
      const employee = await invite(ownerCookie, "revoke-employee", "EMPLOYEE");
      const admin = await invite(ownerCookie, "revoke-admin", "ADMIN");

      expect((await revoke(adminCookie, employee.body.id)).status).toBe(201);
      expect((await revoke(adminCookie, admin.body.id)).status).toBe(403);
      expect((await revoke(ownerCookie, admin.body.id)).status).toBe(201);
    });
  });

  describe("roles", () => {
    it("lets only the owner promote an employee to admin", async () => {
      const { membershipId } = await addMember("promoted", Role.EMPLOYEE);

      expect((await setRole(adminCookie, membershipId, "ADMIN")).status).toBe(403);
      expect((await setRole(ownerCookie, membershipId, "ADMIN")).status).toBe(200);
    });

    it("lets only the owner demote an admin", async () => {
      const { membershipId } = await addMember("demoted", Role.ADMIN);

      expect((await setRole(adminCookie, membershipId, "EMPLOYEE")).status).toBe(403);
      expect((await setRole(ownerCookie, membershipId, "EMPLOYEE")).status).toBe(200);
    });
  });

  describe("removal", () => {
    it("lets an admin remove an employee", async () => {
      const { membershipId } = await addMember("removed-employee", Role.EMPLOYEE);

      expect((await remove(adminCookie, membershipId)).status).toBe(204);
    });

    it("lets only the owner remove an admin", async () => {
      const { membershipId } = await addMember("removed-admin", Role.ADMIN);

      expect((await remove(adminCookie, membershipId)).status).toBe(403);
      expect(await prisma.membership.count({ where: { id: BigInt(membershipId) } })).toBe(1);
      expect((await remove(ownerCookie, membershipId)).status).toBe(204);
    });
  });
});
