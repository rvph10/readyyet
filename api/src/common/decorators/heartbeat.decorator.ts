import { Logger } from "@nestjs/common";

const logger = new Logger("Heartbeat");

// Push monitors in Uptime Kuma (ADR 0157): a run that finishes pings its
// monitor, one that throws or never starts lets it go down. Only where
// UPTIME_PUSH_URL is set, production.
//
// Put it right above the method, under @Cron: it replaces the method, and
// @Cron's metadata has to land on the replacement.
export function Heartbeat(name: string): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const run = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const result = await run.apply(this, args);
      const base = process.env.UPTIME_PUSH_URL;
      if (base) {
        // Not awaited: a slow monitor mustn't hold the next run back.
        fetch(`${base}-${name}`, { signal: AbortSignal.timeout(10_000) }).catch((error: unknown) => {
          logger.warn(`Heartbeat ${name} not sent: ${String(error)}`);
        });
      }
      return result;
    };
  };
}
