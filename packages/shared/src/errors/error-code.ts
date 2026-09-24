export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  UNAUTHORIZED: "UNAUTHORIZED",
  // Signed in, but too long ago for this action: sign in again first.
  REAUTHENTICATION_REQUIRED: "REAUTHENTICATION_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  // The Location's trial or subscription is over, choosing a plan lifts it.
  LOCATION_FROZEN: "LOCATION_FROZEN",
  // Essentiel's member limit, moving to Pro lifts it.
  MEMBER_LIMIT_REACHED: "MEMBER_LIMIT_REACHED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
