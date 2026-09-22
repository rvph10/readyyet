import { ArgumentsHost, HttpException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AppExceptionFilter } from "../src/common/filters/app-exception.filter";
import { NotFoundError } from "../src/common/errors/app-error";

function mockHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe("AppExceptionFilter", () => {
  const filter = new AppExceptionFilter();

  it("maps an AppError to its own status and code", () => {
    const { host, status, json } = mockHost();

    filter.catch(new NotFoundError("Ticket not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Ticket not found", details: undefined },
    });
  });

  it("maps a plain HttpException by status, keeping its message", () => {
    const { host, status, json } = mockHost();

    filter.catch(new HttpException("bad request", 400), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "bad request" },
    });
  });

  it("hides an unexpected error behind a generic 500", () => {
    const { host, status, json } = mockHost();

    filter.catch(new Error("boom"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });
});
