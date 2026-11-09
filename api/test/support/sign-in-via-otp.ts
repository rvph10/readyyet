import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../src/database/prisma.service";

// Better Auth's emailOTP plugin stores the code in the existing
// Verification table under identifier "sign-in-otp-<email>", value
// "<otp>:<attempts>" (plain text, storeOTP not overridden), confirmed by
// reading the plugin's own source. Reading it directly here hits the
// real flow end to end, same "real dependency, not a mock" preference
// used for Resend's own test-mode addresses elsewhere in this suite, no
// email interception needed.
//
// One call covers both signup and sign-in: sign-in/email-otp
// auto-registers a new user on first successful verification (Better
// Auth's default, disableSignUp: false).
// Each sign-in from its own address: signing in is a test's setup, not what
// it checks, and the 10-a-minute limit per address would otherwise cap how
// many Users one file can create.
let signIns = 0;

export async function signInViaOtp(app: INestApplication, prisma: PrismaService, email: string): Promise<string> {
  const n = ++signIns;
  const ip = `198.18.${Math.floor(n / 250)}.${n % 250}`;
  await request(app.getHttpServer())
    .post("/api/auth/email-otp/send-verification-otp")
    .set("X-Real-IP", ip)
    .send({ email, type: "sign-in" });

  const verification = await prisma.verification.findFirstOrThrow({
    where: { identifier: `sign-in-otp-${email}` },
    orderBy: { createdAt: "desc" },
  });
  const otp = verification.value.split(":")[0];

  const response = await request(app.getHttpServer())
    .post("/api/auth/sign-in/email-otp")
    .set("X-Real-IP", ip)
    .send({ email, otp, name: "Test User" });

  return response.headers["set-cookie"][0];
}
