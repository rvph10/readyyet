import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../dto/error.response.dto";

const DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR: the request is invalid",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHENTICATED: no valid session",
  [HttpStatus.PAYMENT_REQUIRED]: "LOCATION_FROZEN: the location's trial or subscription is over",
  [HttpStatus.FORBIDDEN]: "UNAUTHORIZED: signed in, but not allowed to do this",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND: the resource doesn't exist, or isn't visible to you",
  [HttpStatus.CONFLICT]: "CONFLICT: not possible in the resource's current state",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED: too many requests, retry after the Retry-After header's seconds",
};

// Documents the error responses a route can return, all in the shape the
// global AppExceptionFilter writes.
export function ApiErrors(...statuses: HttpStatus[]) {
  return applyDecorators(...statuses.map((status) => ApiError(status, DESCRIPTIONS[status])));
}

// For a route whose error needs its own explanation.
export function ApiError(status: HttpStatus, description?: string) {
  return ApiResponse({ status, description, type: ApiErrorResponseDto });
}
