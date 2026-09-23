import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { applyHttpMiddleware } from "../../src/common/http-middleware";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  applyHttpMiddleware(app);
  await app.init();
  return app;
}
