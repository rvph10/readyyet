import * as Sentry from "@sentry/nestjs";
import { maskTrackingCode } from "./common/logging/pino-http-options";

// Loaded by main.ts right after dotenv: Sentry hooks into modules as they
// are first required. Without SENTRY_DSN (local, tests) this does nothing.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Both set by Railway on every deploy.
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
  release: process.env.RAILWAY_GIT_COMMIT_SHA,
  // Only the method and path of a failing request go out: its body and
  // query carry customer data, and a tracking code in the path gives
  // access to a ticket (masked like in the logs). The transaction name is
  // the raw path too, "GET /tracking/<code>".
  beforeSend(event) {
    if (event.request) {
      const { method, url } = event.request;
      event.request = { method, url: url && maskTrackingCode(url.split("?")[0]) };
    }
    if (event.transaction) {
      event.transaction = maskTrackingCode(event.transaction);
    }
    delete event.user;
    for (const exception of event.exception?.values ?? []) {
      if (exception.type === "PrismaClientValidationError" && exception.value) {
        exception.value = withoutQueryArguments(exception.value);
      }
    }
    return event;
  },
});

// Prisma quotes the whole query, argument values included, between the line
// naming the call and the last line saying what's wrong with it.
export function withoutQueryArguments(message: string): string {
  const lines = message.split("\n").filter((line) => line.trim());
  return `${lines[0]} ${lines[lines.length - 1]}`;
}
