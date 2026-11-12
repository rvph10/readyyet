import { randomUUID } from "node:crypto";
import { vi } from "vitest";

// No test sends a real email: every one counts against the Resend plan, and
// a suite run sent hundreds (sign-ins, Tickets, invitations). Resend accepts
// every send here, the way it does for its @resend.dev test addresses. Tests
// that need a refusal spy on emails.send as before. Webhook signatures are
// still checked by the real client.
vi.mock("../../src/email/resend-client", async (importOriginal) => {
  // CI no longer needs the real key.
  process.env.RESEND_API_KEY ??= "re_tests_never_send";
  const actual = await importOriginal<typeof import("../../src/email/resend-client")>();
  const client = actual.getResendClient();
  client.emails.send = () => Promise.resolve({ data: { id: randomUUID() }, error: null, headers: null });
  return { ...actual, getResendClient: () => client };
});
