import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
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
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const body = this.toErrorResponse(exception);
    const status = this.statusFor(exception);

    response.status(status).json(body);
  }

  private statusFor(exception: unknown): number {
    return exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private toErrorResponse(exception: unknown): ApiErrorResponse {
    if (exception instanceof AppError) {
      return { error: { code: exception.code, message: exception.message, details: exception.details } };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        error: {
          code: STATUS_TO_CODE[status] ?? ErrorCode.VALIDATION_ERROR,
          message: exception.message,
        },
      };
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return { error: { code: ErrorCode.INTERNAL_ERROR, message: "Internal server error" } };
  }
}
