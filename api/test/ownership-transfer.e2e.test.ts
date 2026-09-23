// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

// ADR 0017.
describe("Transferring a business's ownership", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  let counter = 0;

  let owner: { cookie: string; id: string };
  const address = (label: string) => `delivered+transfer-${stamp}-${++counter}-${label}@resend.dev`;

  // Signing in is rate limited (10 codes a minute), only Users who make
  // requests sign in, the others are created directly.
  async function signIn(label: string) {
    const email = address(label);
    const cookie = await signInViaOtp(app, prisma, email);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return { cookie, id: user.id };
  }

  function createUser(label: string) {
    return prisma.user.create({ data: { id: randomUUID(), email: address(label), name: label } });
  }

  const location = (name: string) => ({
    name,
    businessTypeCode: "GARAGE",
    contactPhone: "+32470123456",
    contactEmail: "shop@transfer.test",
    locale: "EN",
  });

  // A new business of the same signed-in owner, with two Locations and
  // an Admin at the first one only.
  async function setUp() {
    const admin = await createUser("admin");
    const business = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", owner.cookie)
      .send({ name: "Transfer Test", location: location("First") });
    const businessId = business.body.id as string;
    const first = business.body.locations[0].id as string;
    const second = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/locations`)
      .set("Cookie", owner.cookie)
      .send(location("Second"));
    await prisma.membership.create({ data: { userId: admin.id, locationId: first, role: Role.ADMIN } });
    return { admin, businessId, locationIds: [first, second.body.id as string] };
  }

  function transfer(cookie: string, businessId: string, userId: string) {
    return request(app.getHttpServer())
      .post(`/businesses/${businessId}/transfer-ownership`)
      .set("Cookie", cookie)
      .send({ userId });
  }

  function rolesOf(userId: string, locationIds: string[]) {
    return Promise.all(
      locationIds.map(async (locationId) => {
        const membership = await prisma.membership.findUnique({ where: { userId_locationId: { userId, locationId } } });
        return membership?.role;
      }),
    );
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    owner = await signIn("owner");
  });

  afterAll(async () => {
    await app.close();
  });

  it("makes the admin owner of every location, and keeps the old owner on as admin", async () => {
    const { admin, businessId, locationIds } = await setUp();

    const response = await transfer(owner.cookie, businessId, admin.id);

    expect(response.status).toBe(200);
    expect(response.body.ownerId).toBe(admin.id);
    expect(await rolesOf(admin.id, locationIds)).toEqual([Role.OWNER, Role.OWNER]);
    expect(await rolesOf(owner.id, locationIds)).toEqual([Role.ADMIN, Role.ADMIN]);
  });

  it("hands over what only the owner can do", async () => {
    const { businessId, locationIds } = await setUp();
    const admin = await signIn("new-owner");
    await prisma.membership.create({ data: { userId: admin.id, locationId: locationIds[0], role: Role.ADMIN } });
    await transfer(owner.cookie, businessId, admin.id);
    const addLocation = (cookie: string) =>
      request(app.getHttpServer())
        .post(`/businesses/${businessId}/locations`)
        .set("Cookie", cookie)
        .send(location("Third"));

    expect((await addLocation(owner.cookie)).status).toBe(403);
    expect((await addLocation(admin.cookie)).status).toBe(201);
    expect((await transfer(owner.cookie, businessId, admin.id)).status).toBe(403);
  });

  it("is the owner's alone", async () => {
    const { businessId, locationIds } = await setUp();
    const admin = await signIn("would-be-owner");
    await prisma.membership.create({ data: { userId: admin.id, locationId: locationIds[1], role: Role.ADMIN } });

    expect((await transfer(admin.cookie, businessId, admin.id)).status).toBe(403);
  });

  it("only goes to an admin of one of the business's locations", async () => {
    const { businessId, locationIds } = await setUp();
    const employee = await createUser("employee");
    await prisma.membership.create({ data: { userId: employee.id, locationId: locationIds[0], role: Role.EMPLOYEE } });
    const stranger = await createUser("stranger");

    expect((await transfer(owner.cookie, businessId, employee.id)).status).toBe(400);
    expect((await transfer(owner.cookie, businessId, stranger.id)).status).toBe(400);
    expect((await transfer(owner.cookie, businessId, "no-such-user")).status).toBe(400);
    expect((await transfer(owner.cookie, businessId, owner.id)).status).toBe(409);
    expect((await prisma.business.findUniqueOrThrow({ where: { id: businessId } })).ownerId).toBe(owner.id);
  });

  it("refuses a transfer when the owner changed after the request read it", async () => {
    const { admin, businessId, locationIds } = await setUp();
    const otherOwner = await createUser("racing-owner");

    // Holds a row lock on the business while changing its owner, so the
    // request below passes its checks with the old owner, then waits on
    // the lock in its conditional update and finds the owner changed.
    let lockTaken!: () => void;
    let commit!: () => void;
    const locked = new Promise<void>((resolve) => (lockTaken = resolve));
    const committed = new Promise<void>((resolve) => (commit = resolve));
    const racingTransfer = prisma.$transaction(async (tx) => {
      await tx.business.update({ where: { id: businessId }, data: { ownerId: otherOwner.id } });
      lockTaken();
      await committed;
    });
    await locked;

    const response = transfer(owner.cookie, businessId, admin.id).then((result) => result);
    await new Promise((resolve) => setTimeout(resolve, 300));
    commit();
    await racingTransfer;

    expect((await response).status).toBe(409);
    expect(await rolesOf(owner.id, locationIds)).toEqual([Role.OWNER, Role.OWNER]);
    expect(await rolesOf(admin.id, locationIds)).toEqual([Role.ADMIN, undefined]);
  });

  it("returns 404 for an unknown business", async () => {
    const { admin } = await setUp();

    expect((await transfer(owner.cookie, "00000000-0000-0000-0000-000000000000", admin.id)).status).toBe(404);
    expect((await transfer(owner.cookie, "not-a-uuid", admin.id)).status).toBe(404);
  });
});
