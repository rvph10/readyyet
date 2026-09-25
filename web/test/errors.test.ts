import { ErrorCode } from "@readyyet/shared";
import { describe, expect, it } from "vitest";
import { ApiError, actionResult, pageData } from "../src/lib/api/errors";

function failure(status: number, code: ErrorCode, extra: object = {}, headers: HeadersInit = {}) {
  return {
    error: { error: { code, message: "from the API", requestId: "req-1", ...extra } },
    response: new Response(null, { status, headers }),
  };
}

// redirect() and notFound() throw an error whose digest says where to go.
function digestOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { digest: string }).digest;
  }
  throw new Error("expected a throw");
}

describe("pageData", () => {
  it("returns the data of a successful call", () => {
    expect(pageData({ data: { id: "t1" }, response: new Response() })).toEqual({ id: "t1" });
  });

  it("sends a visitor without a session to sign-in", () => {
    expect(digestOf(() => pageData(failure(401, ErrorCode.UNAUTHENTICATED)))).toContain("/sign-in");
  });

  it("renders the not-found page for NOT_FOUND", () => {
    expect(digestOf(() => pageData(failure(404, ErrorCode.NOT_FOUND)))).toContain("404");
  });

  it("throws anything else as an ApiError carrying the requestId", () => {
    const run = () => pageData(failure(409, ErrorCode.CONFLICT));
    expect(run).toThrow(ApiError);
    expect(run).toThrow("request req-1");
  });

  it("treats a body that isn't the API's envelope as an internal error", () => {
    const run = () => pageData({ error: "<html>Bad gateway</html>", response: new Response(null, { status: 502 }) });
    expect(run).toThrow("502 INTERNAL_ERROR");
  });
});

describe("actionResult", () => {
  it("is ok for a successful call", () => {
    expect(actionResult({ data: {}, response: new Response() })).toEqual({ ok: true });
  });

  it("lists the rules each input failed", () => {
    const details = [{ property: "customer.email", constraints: { isEmail: "customer.email must be an email" } }];
    expect(actionResult(failure(400, ErrorCode.VALIDATION_ERROR, { details }))).toEqual({
      ok: false,
      code: ErrorCode.VALIDATION_ERROR,
      fields: { "customer.email": ["isEmail"] },
      retryAfter: undefined,
    });
  });

  it("says how long to wait when rate limited", () => {
    expect(actionResult(failure(429, ErrorCode.RATE_LIMITED, {}, { "retry-after": "42" }))).toMatchObject({
      ok: false,
      code: ErrorCode.RATE_LIMITED,
      retryAfter: 42,
    });
  });

  it("sends a visitor without a session to sign-in", () => {
    expect(digestOf(() => actionResult(failure(401, ErrorCode.UNAUTHENTICATED)))).toContain("/sign-in");
  });

  it("throws a server error, so it's reported rather than shown as a form error", () => {
    const run = () => actionResult(failure(500, ErrorCode.INTERNAL_ERROR));
    expect(run).toThrow(ApiError);
    expect(run).toThrow("request req-1");
  });

  it("throws a response that isn't the API's envelope", () => {
    expect(() =>
      actionResult({ error: "<html>Bad gateway</html>", response: new Response(null, { status: 502 }) }),
    ).toThrow(ApiError);
  });
});
