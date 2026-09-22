import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@readyyet/db";

// Better Auth owns its own PrismaClient/connection, separate from
// PrismaService (src/database/prisma.service.ts). It's mounted as raw
// middleware outside Nest's DI, not worth coupling its lifecycle to
// Nest's module init/shutdown for a single-instance app.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // No email verification yet, Resend isn't wired up. Add once it is,
    // see docs/decisions/ for the ADR when that happens.
    requireEmailVerification: false,
  },
  // Disabled by default outside production, so this has to be explicit.
  // Nest's guards (and @nestjs/throttler) never see these routes, see
  // docs/decisions/0009-rate-limiting-and-request-logging.md.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
});
