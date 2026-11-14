import "reflect-metadata";
import { Cron } from "@nestjs/schedule";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Heartbeat } from "../src/common/decorators/heartbeat.decorator";

class Jobs {
  calls = 0;

  @Cron("*/5 * * * *")
  @Heartbeat("retry")
  sweep() {
    this.calls += 1;
    return Promise.resolve("done");
  }

  @Heartbeat("broken")
  broken() {
    return Promise.reject(new Error("sweep failed"));
  }
}

describe("Heartbeat", () => {
  const fetch = vi.fn().mockResolvedValue(new Response("ok"));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("UPTIME_PUSH_URL", "https://kuma.test/api/push/key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetch.mockClear();
  });

  it("pings the job's monitor once a run finishes, keeping its result and this", async () => {
    const jobs = new Jobs();
    await expect(jobs.sweep()).resolves.toBe("done");
    expect(jobs.calls).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("https://kuma.test/api/push/key-retry");
  });

  it("sends nothing when the run throws, so the monitor goes down", async () => {
    await expect(new Jobs().broken()).rejects.toThrow("sweep failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends nothing without UPTIME_PUSH_URL", async () => {
    vi.stubEnv("UPTIME_PUSH_URL", undefined);
    await new Jobs().sweep();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("doesn't fail the run when the monitor can't be reached", async () => {
    fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(new Jobs().sweep()).resolves.toBe("done");
  });

  it("leaves @Cron's schedule on the method the scheduler calls", () => {
    const sweep = Object.getOwnPropertyDescriptor(Jobs.prototype, "sweep")?.value as object;
    expect(Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", sweep)).toMatchObject({
      cronTime: "*/5 * * * *",
    });
  });
});
