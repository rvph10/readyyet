import { ErrorCode, type ApiErrorResponse } from "@readyyet/shared";
import { notFound, redirect } from "next/navigation";

type ApiErrorBody = ApiErrorResponse["error"];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
    readonly retryAfter?: number,
  ) {
    // In production Next.js hides this from the browser and logs it with the
    // digest error.tsx shows, so the digest leads to the API's requestId.
    super(`API answered ${status} ${body.code}, request ${body.requestId ?? "unknown"}`);
    this.name = "ApiError";
  }
}

// What openapi-fetch returns, whatever the endpoint.
interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function toApiError({ error, response }: ApiResult<unknown>): ApiError {
  const retryAfter = Number(response.headers.get("retry-after")) || undefined;
  // Anything but our envelope (a proxy's HTML page, an empty body) is
  // reported as the API's own unexpected error.
  const body =
    typeof error === "object" && error !== null && "error" in error
      ? (error as ApiErrorResponse).error
      : { code: ErrorCode.INTERNAL_ERROR, message: "Unexpected response" };
  return new ApiError(response.status, body, retryAfter);
}

// For a page's data: a missing session goes to sign-in, a missing resource
// to the not-found page, anything else to the area's error.tsx.
export function pageData<T>(result: ApiResult<T>): T {
  if (result.error === undefined) {
    return result.data as T;
  }
  const error = toApiError(result);
  if (error.body.code === ErrorCode.UNAUTHENTICATED) {
    redirect("/sign-in");
  }
  if (error.body.code === ErrorCode.NOT_FOUND) {
    notFound();
  }
  throw error;
}

export type ActionResult = { ok: true } | ActionFailure;

export interface ActionFailure {
  ok: false;
  code: ErrorCode;
  // Input name to the rules it failed, from a VALIDATION_ERROR.
  fields?: Record<string, string[]>;
  retryAfter?: number;
}

// For a server action: the form shows a failure it can do something about,
// in its own words per code, never the API's message. A 5xx is thrown
// instead, so it's reported and logged with its requestId, like a page's.
export function actionResult(result: ApiResult<unknown>): ActionResult {
  if (result.error === undefined) {
    return { ok: true };
  }
  const error = toApiError(result);
  if (error.status >= 500) {
    throw error;
  }
  const { body, retryAfter } = error;
  if (body.code === ErrorCode.UNAUTHENTICATED) {
    redirect("/sign-in");
  }
  const fields = Array.isArray(body.details)
    ? Object.fromEntries(
        (body.details as { property: string; constraints: Record<string, string> }[]).map((issue) => [
          issue.property,
          Object.keys(issue.constraints),
        ]),
      )
    : undefined;
  return { ok: false, code: body.code, fields, retryAfter };
}
