import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@readyyet/shared";

export abstract class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.UNAUTHENTICATED, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.FORBIDDEN, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}
