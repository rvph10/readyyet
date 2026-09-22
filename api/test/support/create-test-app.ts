import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import pinoHttp from "pino-http";
import { AppModule } from "../../src/app.module";
import { pinoHttpOptions } from "../../src/common/logging/pino-http-options";

// Mirrors main.ts's bootstrap(): pino-http has to be mounted the same way
// here as in production, or request.log is absent and AppExceptionFilter's
// unexpected-error path (which logs via request.log) throws instead of
// returning its generic 500. main.ts's own app.use() call isn't reached by
// Test.createTestingModule(), so it must be repeated here.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(pinoHttp(pinoHttpOptions()));
  await app.init();
  return app;
}
