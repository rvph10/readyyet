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
export async function signInViaOtp(app: INestApplication, prisma: PrismaService, email: string): Promise<string> {
  await request(app.getHttpServer()).post("/api/auth/email-otp/send-verification-otp").send({ email, type: "sign-in" });

  const verification = await prisma.verification.findFirstOrThrow({
    where: { identifier: `sign-in-otp-${email}` },
    orderBy: { createdAt: "desc" },
  });
  const otp = verification.value.split(":")[0];

  const response = await request(app.getHttpServer())
    .post("/api/auth/sign-in/email-otp")
    .send({ email, otp, name: "Test User" });

  return response.headers["set-cookie"][0];
}
