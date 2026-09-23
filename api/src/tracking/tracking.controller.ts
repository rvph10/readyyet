import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { TrackingService } from "./tracking.service";

@ApiTags("Tracking")
@AllowAnonymous()
@Controller("tracking")
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get(":code")
  // Tighter than the global 60/min: this is the only public read, a
  // customer refreshing their page never needs more than this.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  // The response is one customer's ticket, no shared cache should keep it.
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Public, no-login view of a ticket by its tracking code (ADR 0004)" })
  findByCode(@Param("code") code: string) {
    return this.tracking.findByCode(code);
  }
}
