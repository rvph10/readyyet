import { describe, expect, it } from "vitest";
import { waitForResendSlot } from "../src/email/resend-client";

describe("waitForResendSlot", () => {
  it("never lets more than 10 requests start within one second", async () => {
    const startedAt: number[] = [];
    await Promise.all(
      Array.from({ length: 12 }, async () => {
        await waitForResendSlot();
        startedAt.push(Date.now());
      }),
    );

    startedAt.sort((a, b) => a - b);
    for (let i = 10; i < startedAt.length; i++) {
      expect(startedAt[i] - startedAt[i - 10]).toBeGreaterThanOrEqual(1000);
    }
  });
});
