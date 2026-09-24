import { Controller, Get, Header } from "@nestjs/common";
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { ApiServiceUnavailableResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../database/prisma.service";
import { ApiErrorResponseDto } from "../common/dto/error.response.dto";

@ApiTags("Health")
@AllowAnonymous()
// Hit frequently and legitimately by infra health probes; throttling
// would cause false-negative health failures.
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  // The commit this deploy runs, set by Railway. Promoting staging to main
  // waits for staging to answer here with the commit being promoted.
  @Header("x-release", process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown")
  // Replaces the 503 schema @HealthCheck() documents: AppExceptionFilter
  // answers a failed check with the error envelope, not Terminus's own body.
  @ApiServiceUnavailableResponse({ schema: { $ref: getSchemaPath(ApiErrorResponseDto) } })
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.pingCheck("database", this.prisma)]);
  }
}
