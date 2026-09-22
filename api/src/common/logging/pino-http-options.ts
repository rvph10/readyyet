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
    transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  };
}
