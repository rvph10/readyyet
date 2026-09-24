import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@readyyet/db";
import * as Sentry from "@sentry/nestjs";
import { ApiErrorResponse, ErrorCode } from "@readyyet/shared";
import { AppError, ConflictError, NotFoundError } from "../errors/app-error";
import { withoutQueryArguments } from "../logging/redact";

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

// A service checks first where it can, but a concurrent request can still
// take a unique value or remove a row between that check and the write.
function fromPrismaError(exception: unknown): unknown {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === "P2002") return new ConflictError("Conflicts with an existing record");
    if (exception.code === "P2025") return new NotFoundError("Not found");
  }
  return exception;
}

// body-parser rejects a body before any route runs (too large, unsupported
// charset) with an http-errors error, not an HttpException. expose is how
// http-errors marks a client error whose message is safe to show.
function fromBodyParserError(exception: unknown): unknown {
  if (exception instanceof Error && "expose" in exception && exception.expose === true && "status" in exception) {
    return new HttpException(exception.message, exception.status as number);
  }
  return exception;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(caught: unknown, host: ArgumentsHost): void {
    const exception = fromBodyParserError(fromPrismaError(caught));
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    const body = this.toErrorResponse(exception, request);
    const status = this.statusFor(exception);

    response.status(status).json(body);
  }

  private statusFor(exception: unknown): number {
    return exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private toErrorResponse(exception: unknown, request: Request): ApiErrorResponse {
    // pino-http types req.id as string | number | object, but our own
    // genReqId (common/logging/pino-http-options.ts) only returns strings.
    const requestId = request.id as string | undefined;

    if (exception instanceof AppError) {
      return {
        error: { code: exception.code, message: exception.message, details: exception.details, requestId },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        error: {
          code: STATUS_TO_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.VALIDATION_ERROR),
          message: exception.message,
          requestId,
        },
      };
    }

    request.log.error(this.forLog(exception));
    Sentry.captureException(exception);
    return { error: { code: ErrorCode.INTERNAL_ERROR, message: "Internal server error", requestId } };
  }

  private forLog(exception: unknown): unknown {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return exception.stack?.replace(exception.message, withoutQueryArguments(exception.message));
    }
    return exception instanceof Error ? exception.stack : exception;
  }
}
