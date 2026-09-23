import { randomUUID } from "node:crypto";
import type { Options } from "pino-http";

export function pinoHttpOptions(): Options {
  return {
    level: process.env.LOG_LEVEL ?? "info",
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = typeof existing === "string" ? existing : randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
    serializers: {
      // A tracking code is the only thing guarding a ticket's public page
      // (ADR 0004), so it's treated like the cookie above, not logged.
      req: (req: { url: string }) => {
        req.url = maskTrackingCode(req.url);
        return req;
      },
    },
    transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  };
}

function maskTrackingCode(url: string): string {
  return url.replace(/^\/tracking\/[^/?#]+/, "/tracking/[redacted]");
}
