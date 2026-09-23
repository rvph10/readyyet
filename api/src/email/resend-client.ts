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

// Resend allows 10 requests per second across the whole team, over that
// it answers rate_limit_exceeded. Spacing request starts ~8/s leaves
// headroom for network jitter bunching them up on arrival. Module-level,
// not per EmailService instance: auth.ts constructs its own EmailService
// outside Nest's DI, both must share one budget. Per process only, fine
// for one API instance, not a cross-instance limiter.
const MIN_MS_BETWEEN_REQUESTS = 120;
let nextSlotAt = 0;

export async function waitForResendSlot(): Promise<void> {
  const now = Date.now();
  const slotAt = Math.max(now, nextSlotAt);
  nextSlotAt = slotAt + MIN_MS_BETWEEN_REQUESTS;
  if (slotAt > now) {
    await new Promise((resolve) => setTimeout(resolve, slotAt - now));
  }
}
