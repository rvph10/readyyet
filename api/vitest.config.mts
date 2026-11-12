import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // One file at a time, as before: they share one database.
    fileParallelism: false,
    // Above one send's worst case: up to 3 attempts with 2s of backoff
    // between them (email.service.ts), which the retry tests go through.
    testTimeout: 15_000,
    setupFiles: ["test/support/resend-setup.ts", "test/support/contract-setup.ts"],
  },
});
