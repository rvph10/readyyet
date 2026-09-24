// Same reason as main.ts: auth.ts reads DATABASE_URL at import time.
import "dotenv/config";
import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createOpenApiDocument } from "./openapi";

// Runs from dist/, not through a TS loader: the @nestjs/swagger compiler
// plugin that infers DTO schemas only runs as part of nest build.
async function generate() {
  // Never initialised, so nothing connects to Postgres or starts a cron.
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
  const document = createOpenApiDocument(app);
  writeFileSync(join(__dirname, "..", "openapi.json"), `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate();
