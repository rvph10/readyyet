// Must run before any other import: auth.ts constructs a PrismaClient at
// module-evaluation time (before NestFactory.create even runs), so
// DATABASE_URL has to be in process.env before that import is reached.
import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { applyHttpMiddleware } from "./common/http-middleware";

async function bootstrap() {
  // Better Auth needs the raw request body; AuthModule re-adds the default
  // body parsers for every other route. See docs/decisions/ for the ADR.
  // bufferLogs holds Nest's own startup logs until useLogger below swaps
  // in the Pino logger, so they go through the same structured pipeline.
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  applyHttpMiddleware(app);
  app.useLogger(app.get(Logger));

  // Dev tooling, not something the running app needs, same non-production
  // gating pino-pretty already uses (pino-http-options.ts).
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("ReadyYet API")
      .setDescription(
        "Better Auth's own routes (/api/auth/*) aren't included here, they're raw middleware, not Nest controllers. See ADR 0008/0011.",
      )
      .setVersion("0.0.0")
      .addCookieAuth("better-auth.session_token")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
