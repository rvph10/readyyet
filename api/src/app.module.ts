import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { LoggerModule } from "nestjs-pino";
import { pinoHttpOptions } from "./common/logging/pino-http-options";
import { auth } from "./auth/auth";
import { BusinessModule } from "./business/business.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { createAppValidationPipe } from "./common/pipes/app-validation.pipe";
import { HealthModule } from "./health/health.module";
import { LocationModule } from "./location/location.module";

@Module({
  imports: [
    // useExisting: true — pino-http itself is mounted directly on the raw
    // Express app in main.ts (before AuthModule's own middleware can ever
    // be registered), not through this module's normal configure(). This
    // just wires the AsyncLocalStorage request context for injectable
    // Logger/PinoLogger on top of that. See
    // docs/decisions/0009-rate-limiting-and-request-logging.md.
    LoggerModule.forRoot({ pinoHttp: pinoHttpOptions(), useExisting: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule.forRoot({ auth }),
    HealthModule,
    BusinessModule,
    LocationModule,
  ],
  providers: [
    // APP_FILTER/APP_PIPE, not imperative app.useGlobalFilters/useGlobalPipes
    // calls in main.ts: those never run for e2e tests that build the app via
    // Test.createTestingModule() instead of main.ts's bootstrap(), same
    // reason ThrottlerGuard below is APP_GUARD rather than app.useGlobalGuards().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_PIPE, useFactory: createAppValidationPipe },
  ],
})
export class AppModule {}
