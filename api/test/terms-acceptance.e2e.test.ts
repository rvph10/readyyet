// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { TERMS_VERSION } from "@readyyet/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0130: creating a Business accepts the terms shown above the button, and
// an Owner from before them accepts them once.
describe("Accepting the terms", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookies: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  const stamp = Date.now();
  const address = (label: string) => `delivered+terms-${stamp}-${label}@resend.dev`;
  const location = {
    name: "Atelier",
    businessTypeCode: "GARAGE",
    timeZone: "Europe/Brussels",
    contactPhone: "+32470123456",
    contactEmail: "atelier@terms.test",
    locale: "FR",
  };

  function create(body: object) {
    return request(app.getHttpServer()).post("/businesses").set("Cookie", cookies.owner).send(body);
  }

  async function myBusiness(label: string, businessId: string) {
    const me = await request(app.getHttpServer()).get("/me").set("Cookie", cookies[label]);
    return me.body.memberships.find(
      (membership: { location: { business: { id: string } } }) => membership.location.business.id === businessId,
    ).location.business as { termsAccepted: boolean };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    for (const label of ["owner", "admin"]) {
      cookies[label] = await signInViaOtp(app, prisma, address(label));
      userIds[label] = (await prisma.user.findUniqueOrThrow({ where: { email: address(label) } })).id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("records who accepted which version when a Business is created", async () => {
    const response = await create({ termsVersion: TERMS_VERSION, name: "Accepted", location });

    expect(response.status).toBe(201);
    const acceptances = await prisma.termsAcceptance.findMany({ where: { businessId: response.body.id } });
    expect(acceptances).toEqual([
      expect.objectContaining({ userId: userIds.owner, version: TERMS_VERSION, acceptedAt: expect.any(Date) }),
    ]);
    expect((await myBusiness("owner", response.body.id)).termsAccepted).toBe(true);
  });

  it("creates no Business without the terms in force", async () => {
    expect((await create({ name: "Silent", location })).status).toBe(400);
    expect((await create({ termsVersion: "2020-01-01", name: "Outdated", location })).status).toBe(400);
    expect(await prisma.business.count({ where: { name: { in: ["Silent", "Outdated"] } } })).toBe(0);
  });

  it("lets an Owner from before the terms accept them, once", async () => {
    const created = await create({ termsVersion: TERMS_VERSION, name: "Earlier", location });
    const businessId = created.body.id as string;
    await prisma.termsAcceptance.deleteMany({ where: { businessId } });
    expect((await myBusiness("owner", businessId)).termsAccepted).toBe(false);

    for (let i = 0; i < 2; i++) {
      await request(app.getHttpServer())
        .post(`/businesses/${businessId}/terms-acceptance`)
        .set("Cookie", cookies.owner)
        .send({ termsVersion: TERMS_VERSION })
        .expect(204);
    }

    expect(await prisma.termsAcceptance.count({ where: { businessId } })).toBe(1);
    expect((await myBusiness("owner", businessId)).termsAccepted).toBe(true);
  });

  it("says on the Business itself whether its terms are accepted, with or without a Location", async () => {
    const created = await create({ termsVersion: TERMS_VERSION, name: "No shop left", location });
    const businessId = created.body.id as string;
    await prisma.termsAcceptance.deleteMany({ where: { businessId } });
    await prisma.location.updateMany({ where: { businessId }, data: { deletedAt: new Date() } });

    const business = await request(app.getHttpServer()).get(`/businesses/${businessId}`).set("Cookie", cookies.owner);
    expect(business.body.termsAccepted).toBe(false);
  });

  it("asks a new Owner after a transfer to accept for themselves", async () => {
    const created = await create({ termsVersion: TERMS_VERSION, name: "Handed Over", location });
    const businessId = created.body.id as string;
    await prisma.membership.create({
      data: { userId: userIds.admin, locationId: created.body.locations[0].id, role: Role.ADMIN },
    });
    await request(app.getHttpServer())
      .post(`/businesses/${businessId}/transfer-ownership`)
      .set("Cookie", cookies.owner)
      .send({ userId: userIds.admin })
      .expect((response) => expect(response.status).toBeLessThan(300));

    expect((await myBusiness("admin", businessId)).termsAccepted).toBe(false);
    await request(app.getHttpServer())
      .post(`/businesses/${businessId}/terms-acceptance`)
      .set("Cookie", cookies.admin)
      .send({ termsVersion: TERMS_VERSION })
      .expect(204);
    expect((await myBusiness("admin", businessId)).termsAccepted).toBe(true);
    expect(await prisma.termsAcceptance.count({ where: { businessId } })).toBe(2);
  });

  it("is the Owner's to accept, not an Admin's", async () => {
    const created = await create({ termsVersion: TERMS_VERSION, name: "Admin Tries", location });
    await prisma.membership.create({
      data: { userId: userIds.admin, locationId: created.body.locations[0].id, role: Role.ADMIN },
    });

    const response = await request(app.getHttpServer())
      .post(`/businesses/${created.body.id}/terms-acceptance`)
      .set("Cookie", cookies.admin)
      .send({ termsVersion: TERMS_VERSION });

    expect(response.status).toBe(403);
  });
});
