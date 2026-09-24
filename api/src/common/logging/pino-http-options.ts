import { randomUUID } from "node:crypto";
import type { Options } from "pino-http";
import { maskSearchTerm, maskTrackingCode } from "./redact";

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
      // Treated like the cookie above, see redact.ts. pino logs the parsed
      // query next to the URL.
      req: (req: { url: string; query?: Record<string, unknown> }) => {
        req.url = maskSearchTerm(maskTrackingCode(req.url));
        if (req.query?.q !== undefined) {
          req.query = { ...req.query, q: "[redacted]" };
        }
        return req;
      },
    },
    transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  };
}
