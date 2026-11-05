import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry";

// Runs when the server starts. If it throws, Next.js answers every request
// with a 500, /health included, so a deploy missing a variable fails its
// healthcheck instead of a page failing later (ADR 0045).
export function register() {
  if (!URL.canParse(process.env.API_URL ?? "")) {
    throw new Error("API_URL must be the API's URL");
  }
  if (!URL.canParse(process.env.NEXT_PUBLIC_API_URL ?? "")) {
    throw new Error("NEXT_PUBLIC_API_URL must be the API's public URL");
  }
  if (!URL.canParse(process.env.S3_ENDPOINT ?? "")) {
    throw new Error("S3_ENDPOINT must be the bucket's URL");
  }
  Sentry.init(sentryOptions);
}

// Errors thrown while rendering on the server, server actions included.
export const onRequestError = Sentry.captureRequestError;
