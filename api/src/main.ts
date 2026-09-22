// Must run before any other import: auth.ts constructs a PrismaClient at
// module-evaluation time (before NestFactory.create even runs), so
// DATABASE_URL has to be in process.env before that import is reached.
import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { createAppValidationPipe } from "./common/pipes/app-validation.pipe";

async function bootstrap() {
  // Better Auth needs the raw request body; AuthModule re-adds the default
  // body parsers for every other route. See docs/decisions/ for the ADR.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalPipes(createAppValidationPipe());
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
