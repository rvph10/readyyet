import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Most e2e files send real email through Resend (every OTP sign-in
    // does), and Resend's rate limit is per team, not per process. Each
    // test file runs in its own worker, so resend-client.ts's in-process
    // throttle can only keep the suite under that limit if files run one
    // at a time.
    fileParallelism: false,
    // Above one send's worst case by design: up to 3 attempts against the
    // real Resend API with 2s of backoff between them (email.service.ts).
    // The 5s default failed a test whenever Resend was briefly slow.
    testTimeout: 15_000,
  },
});
