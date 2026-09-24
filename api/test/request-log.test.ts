import { Writable } from "node:stream";
import express from "express";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { pinoHttpOptions } from "../src/common/logging/pino-http-options";

// Through pino itself, not only the serializer: redact paths are applied by
// pino when it writes the line.
async function loggedLine(headers: Record<string, string>) {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const app = express();
  app.use(pinoHttp({ ...pinoHttpOptions(), transport: undefined }, destination));
  app.get("/ping", (_req, res) => {
    res.json({});
  });

  await request(app).get("/ping").set(headers);
  return JSON.parse(lines[lines.length - 1]) as { req: { headers: Record<string, string> } };
}

describe("request log", () => {
  it("leaves the client's IP out", async () => {
    const line = await loggedLine({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "x-real-ip": "203.0.113.7" });

    expect(line.req.headers["x-forwarded-for"]).toBe("[Redacted]");
    expect(line.req.headers["x-real-ip"]).toBe("[Redacted]");
    expect(JSON.stringify(line)).not.toContain("203.0.113.7");
  });

  it("leaves the session cookie out", async () => {
    const line = await loggedLine({ cookie: "better-auth.session_token=secret" });

    expect(line.req.headers.cookie).toBe("[Redacted]");
  });
});
