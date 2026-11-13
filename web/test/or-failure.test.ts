import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { afterEach, describe, expect, it, vi } from "vitest";
import { orFailure } from "../src/lib/api/or-failure";

describe("orFailure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reloads the page when the action is from an older deploy", async () => {
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });

    const settled = vi.fn();
    void orFailure(Promise.reject(new UnrecognizedActionError("gone"))).then(settled);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(reload).toHaveBeenCalledOnce();
    expect(settled).not.toHaveBeenCalled();
  });

  it("turns any other rejection into a failure", async () => {
    expect(await orFailure(Promise.reject(new Error("offline")))).toEqual({ ok: false, code: "INTERNAL_ERROR" });
  });
});
