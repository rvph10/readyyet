import { z } from "zod";

// Checked once at startup (ConfigModule's validate), so a variable missing
// on a deploy stops the API with a clear message instead of surfacing as
// the first failed email or a CORS error. Loose: other variables pass through.
const envSchema = z
  .looseObject({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    WEB_URL: z.url(),
    RESEND_API_KEY: z.string().startsWith("re_"),
    // Either an address or "Name <address>".
    EMAIL_FROM: z.string().includes("@"),
    // Where replies to security emails go, it must reach a person.
    SUPPORT_EMAIL: z.email(),
    // Only production receives Resend's webhooks.
    RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  })
  .refine((env) => env.NODE_ENV !== "production" || env.RESEND_WEBHOOK_SECRET, {
    message: "Required in production",
    path: ["RESEND_WEBHOOK_SECRET"],
  });

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
