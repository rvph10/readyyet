import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

// Called from the browser, straight to the API, so its Set-Cookie lands on
// the root domain the web app's server reads too (ADR 0046).
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [emailOTPClient()],
});
