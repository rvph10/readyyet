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
    const email = `delivered+auth-otp-new-${Date.now()}@resend.dev`;

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
    const email = `delivered+auth-otp-wrong-${Date.now()}@resend.dev`;
    await request(app.getHttpServer())
      .post("/api/auth/email-otp/send-verification-otp")
      .send({ email, type: "sign-in" });

    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email-otp")
      .send({ email, otp: "000000" });

    expect(response.status).toBe(400);
  });

  it("rejects reusing the same OTP a second time", async () => {
    const email = `delivered+auth-otp-reuse-${Date.now()}@resend.dev`;
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
    const email = `delivered+auth-otp-repeat-${Date.now()}@resend.dev`;
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

  it.each([
    ["fr-BE,fr;q=0.9,en;q=0.8", "Votre code de connexion ReadyYet"],
    [undefined, "Your ReadyYet sign-in code"],
  ])("emails the code in the browser's language (%s)", async (acceptLanguage, subject) => {
    const email = `delivered+auth-otp-language-${Date.now()}@resend.dev`;
    const sent = request(app.getHttpServer()).post("/api/auth/email-otp/send-verification-otp");
    if (acceptLanguage) {
      sent.set("Accept-Language", acceptLanguage);
    }
    await sent.send({ email, type: "sign-in" });

    const log = await prisma.emailLog.findFirstOrThrow({ where: { to: email, type: "auth_otp" } });
    expect(log.subject).toBe(subject);
    expect(log.html).toContain(await readOtp(prisma, email));
  });

  // Last: it uses up the rate limit for every test after it.
  it("rate limits repeated send-verification-otp calls", async () => {
    // customRules caps /email-otp/send-verification-otp at 10/min (see
    // api/src/auth/auth.ts); 10 rapid attempts on top of earlier tests'
    // calls guarantees at least one 429.
    const email = `delivered+auth-otp-ratelimit-${Date.now()}@resend.dev`;
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post("/api/auth/email-otp/send-verification-otp").send({ email, type: "sign-in" }),
      ),
    );

    expect(attempts.some((response) => response.status === 429)).toBe(true);
  });
});
