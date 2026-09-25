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

export class ReauthenticationRequiredError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.REAUTHENTICATION_REQUIRED, message, HttpStatus.FORBIDDEN, details);
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

export class LocationFrozenError extends AppError {
  constructor() {
    super(
      ErrorCode.LOCATION_FROZEN,
      "This location has no active plan, choose one to create tickets and invite people",
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class MemberLimitError extends AppError {
  constructor(limit: number) {
    super(
      ErrorCode.MEMBER_LIMIT_REACHED,
      `Essentiel allows ${limit} members, counting pending invitations`,
      HttpStatus.CONFLICT,
    );
  }
}

export class PlanRequiredError extends AppError {
  constructor(feature: string) {
    super(ErrorCode.PLAN_REQUIRED, `${feature} needs the Pro plan`, HttpStatus.PAYMENT_REQUIRED);
  }
}
