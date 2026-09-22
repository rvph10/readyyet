import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { LoggerModule } from "nestjs-pino";
import { pinoHttpOptions } from "./common/logging/pino-http-options";
import { auth } from "./auth/auth";
import { HealthModule } from "./health/health.module";

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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
