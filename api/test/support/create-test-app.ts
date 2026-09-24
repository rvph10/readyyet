import { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { applyHttpMiddleware } from "../../src/common/http-middleware";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  applyHttpMiddleware(app);
  await app.init();
  // Tests run each sweep themselves. Left running, a job would pick up rows
  // other test files left behind and send mid-test, whenever its clock ticks.
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    await job.stop();
  }
  return app;
}
