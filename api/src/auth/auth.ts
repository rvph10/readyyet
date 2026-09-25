import { betterAuth } from "better-auth";
import type { Auth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@readyyet/db";
import { localeFromAcceptLanguage } from "@readyyet/shared";
import { CLIENT_IP_HEADER } from "../common/client-ip";
import { EmailService } from "../email/email.service";
import { buildSignInCodeEmail } from "../notification/staff-email/staff-email";

// Given to the plugin and quoted in the email, so the two can't disagree.
const OTP_EXPIRES_IN_MINUTES = 5;

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: Auth<any> = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // The web app lives on its own origin (ADR 0001), Better Auth rejects
  // state-changing requests from any origin other than baseURL unless
  // it's listed here.
  trustedOrigins: [process.env.WEB_URL as string],
  user: {
    additionalFields: {
      // input: false, a sign-in request can't set it, only the hook below
      // and PATCH /me do (ADR 0018).
      locale: { type: "string", required: false, input: false, defaultValue: "EN" },
      // Only the platform admin sets it (ADR 0032). Declared so the session's
      // user carries it, /me reads it from there.
      salesPartnerSince: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // An account is created by its first sign-in, whose browser
        // language is the best first guess at the User's.
        before(user, ctx) {
          const locale = localeFromAcceptLanguage(ctx?.headers?.get("accept-language"));
          return Promise.resolve({ data: { ...user, locale } });
        },
      },
      update: {
        // Better Auth's own update-user route would store any string as
        // the avatar, only PUT /me/avatar sets it, writing through Prisma
        // after checking the image (ADR 0026). Better Auth merges this over
        // its own data, so dropping the key wouldn't be enough.
        before(user) {
          return Promise.resolve({ data: { ...user, image: undefined } });
        },
      },
    },
  },
  // No password auth: sign-in is by emailed OTP, which confirms the
  // email as a side effect and removes the need for a separate
  // password-reset flow entirely. See ADR 0011.
  plugins: [
    emailOTP({
      expiresIn: OTP_EXPIRES_IN_MINUTES * 60,
      async sendVerificationOTP({ email, otp, type }, ctx) {
        // The plugin also exposes email-verification/forget-password/
        // change-email OTP types (their routes stay reachable
        // regardless), nothing in this app calls them, forget-password
        // is meaningless with no password to reset.
        if (type !== "sign-in") {
          return;
        }
        const { subject, react } = buildSignInCodeEmail({
          locale: localeFromAcceptLanguage(ctx?.headers?.get("accept-language")),
          code: otp,
          expiresInMinutes: OTP_EXPIRES_IN_MINUTES,
        });
        await emailService.send({ to: email, subject, react, type: "auth_otp" });
      },
    }),
  ],
  advanced: {
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
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
