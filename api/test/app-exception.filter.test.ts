import { ArgumentsHost, HttpException } from "@nestjs/common";
import { Prisma } from "@readyyet/db";
import * as Sentry from "@sentry/nestjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppExceptionFilter } from "../src/common/filters/app-exception.filter";
import { NotFoundError } from "../src/common/errors/app-error";

vi.mock("@sentry/nestjs", () => ({ captureException: vi.fn() }));

function mockHost(requestId = "req-1") {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const log = { error: vi.fn() };
  const request = { id: requestId, log };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json, log };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Invalid `prisma.ticket.update()` invocation", {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe("AppExceptionFilter", () => {
  const filter = new AppExceptionFilter();
  const captureException = vi.mocked(Sentry.captureException);

  afterEach(() => {
    captureException.mockClear();
  });

  it("reports only unexpected errors to Sentry, not the ones it answers with a 4xx", () => {
    const error = new Error("boom");

    filter.catch(new NotFoundError("Ticket not found"), mockHost().host);
    filter.catch(new HttpException("Too Many Requests", 429), mockHost().host);
    filter.catch(prismaError("P2002"), mockHost().host);
    expect(captureException).not.toHaveBeenCalled();

    filter.catch(error, mockHost().host);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("maps an AppError to its own status and code", () => {
    const { host, status, json } = mockHost();

    filter.catch(new NotFoundError("Ticket not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Ticket not found", details: undefined, requestId: "req-1" },
    });
  });

  it("maps a plain HttpException by status, keeping its message", () => {
    const { host, status, json } = mockHost();

    filter.catch(new HttpException("bad request", 400), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "bad request", requestId: "req-1" },
    });
  });

  it("maps a 429 to RATE_LIMITED", () => {
    const { host, status, json } = mockHost();

    filter.catch(new HttpException("Too Many Requests", 429), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      error: { code: "RATE_LIMITED", message: "Too Many Requests", requestId: "req-1" },
    });
  });

  it("maps an unlisted 5xx HttpException to INTERNAL_ERROR, not a client error", () => {
    const { host, status, json } = mockHost();

    filter.catch(new HttpException("Service Unavailable Exception", 503), host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Service Unavailable Exception", requestId: "req-1" },
    });
  });

  it("maps a unique constraint violation to a 409, without Prisma's message", () => {
    const { host, status, json, log } = mockHost();

    filter.catch(prismaError("P2002"), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      error: { code: "CONFLICT", message: "Conflicts with an existing record", details: undefined, requestId: "req-1" },
    });
    expect(log.error).not.toHaveBeenCalled();
  });

  it("maps a missing record to a 404", () => {
    const { host, status, json } = mockHost();

    filter.catch(prismaError("P2025"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Not found", details: undefined, requestId: "req-1" },
    });
  });

  it("keeps any other Prisma error a logged 500", () => {
    const { host, status, log } = mockHost();

    filter.catch(prismaError("P2003"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalled();
  });

  it("hides an unexpected error behind a generic 500, logging it via the request logger", () => {
    const { host, status, json, log } = mockHost();
    const error = new Error("boom");

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Internal server error", requestId: "req-1" },
    });
    expect(log.error).toHaveBeenCalledWith(error.stack);
  });
});
