import { Resend } from "resend";

// Lazy, not constructed at module-evaluation time: AppModule (and
// therefore every test that imports it) pulls this in transitively via
// EmailModule, and eagerly reading process.env.RESEND_API_KEY at import
// time would crash the whole app/test suite before RESEND_API_KEY is
// even needed, the same import-time process.env hazard ADR 0008 already
// documents for auth.ts's PrismaClient, just with a wider blast radius
// here since nothing but EmailService actually needs this client.
let client: Resend | undefined;

export function getResendClient(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}
