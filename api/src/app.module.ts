import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule, normalizeIp } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";
import { LoggerModule } from "nestjs-pino";
import { pinoHttpOptions } from "./common/logging/pino-http-options";
import { auth } from "./auth/auth";
import { BillingModule } from "./billing/billing.module";
import { BusinessModule } from "./business/business.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { AppExceptionFilter } from "./common/filters/app-exception.filter";
import { CLIENT_IP_HEADER } from "./common/client-ip";
import { createAppValidationPipe } from "./common/pipes/app-validation.pipe";
import { validateEnv } from "./config/env";
import { CustomerModule } from "./customer/customer.module";
import { EmailModule } from "./email/email.module";
import { HealthModule } from "./health/health.module";
import { InvitationModule } from "./invitation/invitation.module";
import { LocationModule } from "./location/location.module";
import { MeModule } from "./me/me.module";
import { MembershipModule } from "./membership/membership.module";
import { TicketModule } from "./ticket/ticket.module";
import { TrackingModule } from "./tracking/tracking.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [
    // useExisting: true — pino-http itself is mounted directly on the raw
    // Express app in main.ts (before AuthModule's own middleware can ever
    // be registered), not through this module's normal configure(). This
    // just wires the AsyncLocalStorage request context for injectable
    // Logger/PinoLogger on top of that. See
    // docs/decisions/0009-rate-limiting-and-request-logging.md.
    LoggerModule.forRoot({ pinoHttp: pinoHttpOptions(), useExisting: true }),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      // Absent locally and in tests, where the socket address is the client.
      getTracker: (req) => {
        const request = req as Request;
        return normalizeIp(request.header(CLIENT_IP_HEADER) ?? (request.ip as string));
      },
    }),
    // CORS is applied app-wide in common/http-middleware.ts instead, see
    // the comment there.
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
    HealthModule,
    BusinessModule,
    LocationModule,
    MeModule,
    WorkflowModule,
    TicketModule,
    CustomerModule,
    EmailModule,
    InvitationModule,
    MembershipModule,
    TrackingModule,
    CatalogueModule,
    BillingModule,
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
