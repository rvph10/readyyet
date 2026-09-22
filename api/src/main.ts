// Must run before any other import: auth.ts constructs a PrismaClient at
// module-evaluation time (before NestFactory.create even runs), so
// DATABASE_URL has to be in process.env before that import is reached.
import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import pinoHttp from "pino-http";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { pinoHttpOptions } from "./common/logging/pino-http-options";
import { createAppValidationPipe } from "./common/pipes/app-validation.pipe";

async function bootstrap() {
  // Better Auth needs the raw request body; AuthModule re-adds the default
  // body parsers for every other route. See docs/decisions/ for the ADR.
  // bufferLogs holds Nest's own startup logs until useLogger below swaps
  // in the Pino logger, so they go through the same structured pipeline.
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  // Mounted directly on the raw Express app, before any Nest module's
  // configure() has run (that only happens later, inside app.listen()).
  // AuthModule.configure() calls httpAdapter.use() directly too, and fully
  // handles+ends its own requests without calling next(), so this has to
  // win the ordering race or Better-Auth-handled requests never get a
  // req.id/req.log. See docs/decisions/0009-rate-limiting-and-request-logging.md.
  app.use(pinoHttp(pinoHttpOptions()));
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalPipes(createAppValidationPipe());
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
