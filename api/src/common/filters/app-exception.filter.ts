import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { ApiErrorResponse, ErrorCode } from "@readyyet/shared";
import { AppError } from "../errors/app-error";

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
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
          code: STATUS_TO_CODE[status] ?? ErrorCode.VALIDATION_ERROR,
          message: exception.message,
          requestId,
        },
      };
    }

    request.log.error(exception instanceof Error ? exception.stack : exception);
    return { error: { code: ErrorCode.INTERNAL_ERROR, message: "Internal server error", requestId } };
  }
}
