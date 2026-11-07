import { INestApplication } from "@nestjs/common";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { pinoHttpOptions } from "./logging/pino-http-options";

// Shared by main.ts and test/support/create-test-app.ts, so e2e tests run
// through the exact same middleware stack as production.
//
// Everything here is mounted directly on the raw Express app, before any
// Nest module's configure() has run (that only happens later, inside
// app.init()/app.listen()). AuthModule.configure() calls httpAdapter.use()
// directly too, and fully handles+ends its own requests without calling
// next(), so anything that must also apply to /api/auth/* has to win that
// ordering race. See docs/decisions/0009-rate-limiting-and-request-logging.md.
export function applyHttpMiddleware(app: INestApplication) {
  app.use(helmet());
  // Nothing here is meant for a search engine, the public tracking data
  // included (that's the web app's page to show).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
  app.use(pinoHttp(pinoHttpOptions()));
  // Done here rather than via Better Auth's trustedOrigins-driven CORS
  // (disableTrustedOriginsCors in app.module.ts): that one only allows
  // GET/POST/PUT/DELETE, which would fail every PATCH route's preflight.
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });
  // Resend's webhook signature verification needs the exact raw bytes,
  // but AuthModule's own body parser would otherwise JSON-parse this route
  // too (it only skips its own /api/auth basePath). body-parser sets
  // req._body after a successful parse, which makes that later json()
  // call skip re-parsing.
  app.use("/webhooks/resend", express.raw({ type: "application/json" }));
  // Same for Stripe's signature.
  app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
}
