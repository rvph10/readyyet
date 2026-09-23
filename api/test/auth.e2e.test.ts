// Must run before AppModule is imported: auth.ts constructs a PrismaClient
// at module-evaluation time, so DATABASE_URL has to already be set.
import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./support/create-test-app";
import { PrismaService } from "../src/database/prisma.service";
import { signInViaOtp } from "./support/sign-in-via-otp";

async function readOtp(prisma: PrismaService, email: string): Promise<string> {
  const verification = await prisma.verification.findFirstOrThrow({
    where: { identifier: `sign-in-otp-${email}` },
    orderBy: { createdAt: "desc" },
  });
  return verification.value.split(":")[0];
}

describe("Better Auth email OTP", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends an OTP and signs in, creating a new user with a session", async () => {
    const email = `auth-otp-new-${Date.now()}@readyyet.test`;

    const sent = await request(app.getHttpServer())
      .post("/api/auth/email-otp/send-verification-otp")
      .send({ email, type: "sign-in" });
    expect(sent.status).toBe(200);

    const otp = await readOtp(prisma, email);
    const signIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email-otp")
      .send({ email, otp, name: "Auth Test" });

    expect(signIn.status).toBe(200);
    expect(signIn.body.user.email).toBe(email);
    const cookie = signIn.headers["set-cookie"][0];
    expect(cookie).toMatch(/better-auth\.session_token=/);

    const session = await request(app.getHttpServer()).get("/api/auth/get-session").set("Cookie", cookie);
    expect(session.status).toBe(200);
    expect(session.body.user.email).toBe(email);
  });

  it("rejects a wrong OTP", async () => {
    const email = `auth-otp-wrong-${Date.now()}@readyyet.test`;
    await request(app.getHttpServer())
      .post("/api/auth/email-otp/send-verification-otp")
      .send({ email, type: "sign-in" });

    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email-otp")
      .send({ email, otp: "000000" });

    expect(response.status).toBe(400);
  });

  it("rejects reusing the same OTP a second time", async () => {
    const email = `auth-otp-reuse-${Date.now()}@readyyet.test`;
    await request(app.getHttpServer())
      .post("/api/auth/email-otp/send-verification-otp")
      .send({ email, type: "sign-in" });
    const otp = await readOtp(prisma, email);

    const first = await request(app.getHttpServer()).post("/api/auth/sign-in/email-otp").send({ email, otp });
    expect(first.status).toBe(200);

    const second = await request(app.getHttpServer()).post("/api/auth/sign-in/email-otp").send({ email, otp });
    expect(second.status).toBe(400);
  });

  it("signs an already-registered user back in without creating a duplicate", async () => {
    const email = `auth-otp-repeat-${Date.now()}@readyyet.test`;
    const firstCookie = await signInViaOtp(app, prisma, email);
    const firstMe = await request(app.getHttpServer()).get("/api/auth/get-session").set("Cookie", firstCookie);
    const userId = firstMe.body.user.id;

    const secondCookie = await signInViaOtp(app, prisma, email);
    const secondMe = await request(app.getHttpServer()).get("/api/auth/get-session").set("Cookie", secondCookie);

    expect(secondMe.body.user.id).toBe(userId);
  });

  it("resolves no session without a cookie", async () => {
    const response = await request(app.getHttpServer()).get("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it("rate limits repeated send-verification-otp calls", async () => {
    // customRules caps /email-otp/send-verification-otp at 5/min (see
    // api/src/auth/auth.ts); 10 rapid attempts guarantees at least one
    // 429 regardless of how many calls earlier tests in this file made.
    const email = `auth-otp-ratelimit-${Date.now()}@readyyet.test`;
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post("/api/auth/email-otp/send-verification-otp").send({ email, type: "sign-in" }),
      ),
    );

    expect(attempts.some((response) => response.status === 429)).toBe(true);
  });
});
