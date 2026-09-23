import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import express from "express";
import pinoHttp from "pino-http";
import { AppModule } from "../../src/app.module";
import { pinoHttpOptions } from "../../src/common/logging/pino-http-options";

// Mirrors main.ts's bootstrap(): pino-http and the /webhooks/resend raw
// body parser have to be mounted the same way here as in production
// (request.log is absent otherwise, and Resend webhook signature
// verification needs the raw bytes), main.ts's own app.use() calls
// aren't reached by Test.createTestingModule(), so they're repeated here.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(pinoHttp(pinoHttpOptions()));
  app.use("/webhooks/resend", express.raw({ type: "application/json" }));
  await app.init();
  return app;
}
