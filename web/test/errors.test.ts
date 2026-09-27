import { ErrorCode } from "@readyyet/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiError, actionResult, pageData } from "../src/lib/api/errors";

function failure(status: number, code: ErrorCode, extra: object = {}, headers: HeadersInit = {}) {
  return {
    error: { error: { code, message: "from the API", requestId: "req-1", ...extra } },
    response: new Response(null, { status, headers }),
  };
}

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-path": "/invitations/i1?lang=fr" }),
}));

// redirect() and notFound() throw an error whose digest says where to go.
async function digestOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return (error as { digest: string }).digest;
  }
  throw new Error("expected a throw");
}

describe("pageData", () => {
  it("returns the data of a successful call", async () => {
    expect(await pageData({ data: { id: "t1" }, response: new Response() })).toEqual({ id: "t1" });
  });

  it("sends a visitor without a session to sign-in, then back to the page", async () => {
    expect(await digestOf(() => pageData(failure(401, ErrorCode.UNAUTHENTICATED)))).toContain(
      "/sign-in?next=%2Finvitations%2Fi1%3Flang%3Dfr",
    );
  });

  it("renders the not-found page for NOT_FOUND", async () => {
    expect(await digestOf(() => pageData(failure(404, ErrorCode.NOT_FOUND)))).toContain("404");
  });

  it("throws anything else as an ApiError carrying the requestId", async () => {
    const run = () => pageData(failure(409, ErrorCode.CONFLICT));
    await expect(run()).rejects.toThrow(ApiError);
    await expect(run()).rejects.toThrow("request req-1");
  });

  it("treats a body that isn't the API's envelope as an internal error", async () => {
    const run = () => pageData({ error: "<html>Bad gateway</html>", response: new Response(null, { status: 502 }) });
    await expect(run()).rejects.toThrow("502 INTERNAL_ERROR");
  });

  it("throws a failure with an empty body", async () => {
    const response = new Response(null, { status: 503, headers: { "content-length": "0" } });
    await expect(pageData({ error: undefined, response })).rejects.toThrow("503 INTERNAL_ERROR");
  });
});

describe("actionResult", () => {
  it("is ok for a successful call", async () => {
    expect(await actionResult({ data: {}, response: new Response() })).toEqual({ ok: true });
  });

  it("lists the rules each input failed", async () => {
    const details = [{ property: "customer.email", constraints: { isEmail: "customer.email must be an email" } }];
    expect(await actionResult(failure(400, ErrorCode.VALIDATION_ERROR, { details }))).toEqual({
      ok: false,
      code: ErrorCode.VALIDATION_ERROR,
      fields: { "customer.email": ["isEmail"] },
      retryAfter: undefined,
    });
  });

  it("says how long to wait when rate limited", async () => {
    expect(await actionResult(failure(429, ErrorCode.RATE_LIMITED, {}, { "retry-after": "42" }))).toMatchObject({
      ok: false,
      code: ErrorCode.RATE_LIMITED,
      retryAfter: 42,
    });
  });

  it("sends a visitor without a session to sign-in, then back to the page", async () => {
    expect(await digestOf(() => actionResult(failure(401, ErrorCode.UNAUTHENTICATED)))).toContain(
      "/sign-in?next=%2Finvitations%2Fi1%3Flang%3Dfr",
    );
  });

  it("throws a server error, so it's reported rather than shown as a form error", async () => {
    const run = () => actionResult(failure(500, ErrorCode.INTERNAL_ERROR));
    await expect(run()).rejects.toThrow(ApiError);
    await expect(run()).rejects.toThrow("request req-1");
  });

  it("throws a response that isn't the API's envelope", async () => {
    await expect(
      actionResult({ error: "<html>Bad gateway</html>", response: new Response(null, { status: 502 }) }),
    ).rejects.toThrow(ApiError);
  });

  it("doesn't report a failure with an empty body as ok", async () => {
    const response = new Response(null, { status: 409, headers: { "content-length": "0" } });
    expect(await actionResult({ error: undefined, response })).toMatchObject({ ok: false, code: ErrorCode.INTERNAL_ERROR });
  });
});
