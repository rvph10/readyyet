// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

describe("Sales partners, managed by the platform admin", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let userCookie: string;
  let candidateId: string;
  const stamp = Date.now();
  const adminEmail = `delivered+platform-admin-${stamp}@resend.dev`;
  const candidateEmail = `delivered+sales-candidate-${stamp}@resend.dev`;

  function mark(cookie: string, email: string) {
    return request(app.getHttpServer()).post("/admin/sales-partners").set("Cookie", cookie).send({ email });
  }

  function remove(cookie: string, userId: string) {
    return request(app.getHttpServer()).delete(`/admin/sales-partners/${userId}`).set("Cookie", cookie);
  }

  function list(cookie: string) {
    return request(app.getHttpServer()).get("/admin/sales-partners").set("Cookie", cookie);
  }

  beforeAll(async () => {
    // Read on each request, the same as in a deployed environment.
    process.env.PLATFORM_ADMIN_EMAILS = `someone-else@readyyet.test, ${adminEmail.toUpperCase()}`;
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminCookie = await signInViaOtp(app, prisma, adminEmail);
    userCookie = await signInViaOtp(app, prisma, `delivered+not-admin-${stamp}@resend.dev`);
    const candidate = await prisma.user.create({
      data: { id: `candidate-${stamp}`, email: candidateEmail, name: "Candidate" },
    });
    candidateId = candidate.id;
  });

  afterAll(async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    await app.close();
  });

  it("is refused to anyone else", async () => {
    expect((await list(userCookie)).status).toBe(403);
    expect((await mark(userCookie, candidateEmail)).status).toBe(403);
    expect((await remove(userCookie, candidateId)).status).toBe(403);
  });

  it("tells the web app who is the platform admin and who is a sales partner", async () => {
    const admin = await request(app.getHttpServer()).get("/me").set("Cookie", adminCookie);
    expect(admin.body).toMatchObject({ platformAdmin: true, salesPartner: false });
    const user = await request(app.getHttpServer()).get("/me").set("Cookie", userCookie);
    expect(user.body).toMatchObject({ platformAdmin: false, salesPartner: false });
  });

  it("makes a user a sales partner by email, with a referral code", async () => {
    const response = await mark(adminCookie, candidateEmail.toUpperCase());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: candidateId, email: candidateEmail, name: "Candidate" });
    expect(response.body.referralCode).toMatch(/^[\w-]{8}$/);
    expect((await list(adminCookie)).body).toContainEqual(response.body);
  });

  it("refuses to mark a sales partner twice", async () => {
    const response = await mark(adminCookie, candidateEmail);

    expect(response.status).toBe(409);
  });

  it("refuses an email no account uses", async () => {
    expect((await mark(adminCookie, `nobody-${stamp}@readyyet.test`)).status).toBe(404);
    expect((await mark(adminCookie, "not-an-email")).status).toBe(400);
  });

  it("removes the status, and marking again brings the same code back", async () => {
    const { referralCode } = await prisma.user.findUniqueOrThrow({ where: { id: candidateId } });

    expect((await remove(adminCookie, candidateId)).status).toBe(204);
    expect((await list(adminCookie)).body.map((partner: { id: string }) => partner.id)).not.toContain(candidateId);
    expect((await remove(adminCookie, candidateId)).status).toBe(404);

    const again = await mark(adminCookie, candidateEmail);
    expect(again.body.referralCode).toBe(referralCode);
  });

  it("clears the status when the sales partner deletes their account", async () => {
    const email = `delivered+leaving-partner-${stamp}@resend.dev`;
    const cookie = await signInViaOtp(app, prisma, email);
    const { id } = (await mark(adminCookie, email)).body;
    expect((await request(app.getHttpServer()).get("/me").set("Cookie", cookie)).body.salesPartner).toBe(true);

    await request(app.getHttpServer()).delete("/me").set("Cookie", cookie).expect(204);

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user).toMatchObject({ salesPartnerSince: null, deletedAt: expect.any(Date) });
  });
});
