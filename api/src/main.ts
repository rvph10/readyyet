// Must run before any other import: auth.ts constructs a PrismaClient at
// module-evaluation time (before NestFactory.create even runs), so
// DATABASE_URL has to be in process.env before that import is reached.
import "dotenv/config";
import "./instrument";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { applyHttpMiddleware } from "./common/http-middleware";
import { createOpenApiDocument } from "./openapi";

async function bootstrap() {
  // Better Auth needs the raw request body; AuthModule re-adds the default
  // body parsers for every other route. See docs/decisions/ for the ADR.
  // bufferLogs holds Nest's own startup logs until useLogger below swaps
  // in the Pino logger, so they go through the same structured pipeline.
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  applyHttpMiddleware(app);
  app.useLogger(app.get(Logger));
  // Railway stops the old container with SIGTERM on every deploy. Without
  // this the process dies on the spot, cutting off requests in progress,
  // with it the server stops taking new ones and lets those finish. A cron
  // sweep cut off mid-way is safe, its emails are retried.
  app.enableShutdownHooks();

  // Dev tooling, not something the running app needs, same non-production
  // gating pino-pretty already uses (pino-http-options.ts).
  if (process.env.NODE_ENV !== "production") {
    SwaggerModule.setup("docs", app, createOpenApiDocument(app));
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
