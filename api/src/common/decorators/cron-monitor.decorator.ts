import { SentryCron } from "@sentry/nestjs";

// Sentry cron monitors, in production only: check-ins from a dev machine
// would show as missed runs every time it stops.
export const CronMonitor: typeof SentryCron =
  process.env.NODE_ENV === "production" ? SentryCron : () => () => undefined;
