import { betterAuth } from "better-auth";
import type { Auth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@readyyet/db";
import { EmailService } from "../email/email.service";

// Better Auth owns its own PrismaClient/connection, separate from
// PrismaService (src/database/prisma.service.ts). It's mounted as raw
// middleware outside Nest's DI, not worth coupling its lifecycle to
// Nest's module init/shutdown for a single-instance app.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// EmailService is normally Nest-injected, but this file is evaluated
// outside Nest's DI container entirely (see the comment above), so it's
// constructed directly here with the same PrismaClient, exactly the
// reuse resend-client.ts's own comment anticipated.
const emailService = new EmailService(prisma);

// Explicit annotation, not inferred: the emailOTP plugin's zod-based
// schemas make the fully-inferred return type reference an unexported
// zod internal (TS2883, "cannot be named without a reference to
// $strip"). Nothing in this codebase calls auth.api.* directly (only
// AuthModule.forRoot({ auth }) below uses this export), so the base
// Auth<any> type loses no precision we actually rely on. Auth (bare,
// defaulting to Auth<BetterAuthOptions>) doesn't work here, a real
// generic-variance mismatch in better-auth's own types between the
// specific inferred Options and the bare BetterAuthOptions default.
export const auth: Auth<any> = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // No password auth: sign-in is by emailed OTP, which confirms the
  // email as a side effect and removes the need for a separate
  // password-reset flow entirely. See ADR 0011.
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // The plugin also exposes email-verification/forget-password/
        // change-email OTP types (their routes stay reachable
        // regardless), nothing in this app calls them, forget-password
        // is meaningless with no password to reset.
        if (type !== "sign-in") {
          return;
        }
        await emailService.send({
          to: email,
          subject: "Your ReadyYet sign-in code",
          type: "auth_otp",
          html: `<p>Your ReadyYet sign-in code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
          text: `Your ReadyYet sign-in code is ${otp}. It expires in 5 minutes.`,
        });
      },
    }),
  ],
  // Disabled by default outside production, so this has to be explicit.
  // Nest's guards (and @nestjs/throttler) never see these routes, see
  // docs/decisions/0009-rate-limiting-and-request-logging.md.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Both 10/min per IP: the primary defense against brute-forcing a
    // single OTP is the plugin's own per-identifier allowedAttempts: 3,
    // not this path-level counter, this is a coarser DoS/abuse ceiling
    // on top of it, still a real limit, not a rubber stamp.
    customRules: {
      "/sign-in/email-otp": { window: 60, max: 10 },
      "/email-otp/send-verification-otp": { window: 60, max: 10 },
    },
  },
});
