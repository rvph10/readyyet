import type { ErrorCode } from "./error-code";

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}
