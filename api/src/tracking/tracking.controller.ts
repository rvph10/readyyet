import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { SendFeedbackDto } from "../feedback/dto/send-feedback.dto";
import { TrackingDto } from "./dto/tracking.response.dto";
import { TrackingService } from "./tracking.service";

@ApiTags("Tracking")
@AllowAnonymous()
@ApiErrors(HttpStatus.TOO_MANY_REQUESTS)
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
  @ApiErrors(HttpStatus.NOT_FOUND)
  findByCode(@Param("code") code: string): Promise<TrackingDto> {
    return this.tracking.findByCode(code);
  }

  // Also the List-Unsubscribe-Post target, mail clients send it with a
  // "List-Unsubscribe=One-Click" form body (RFC 8058), nothing to read.
  @Post(":code/stop-notifications")
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Stop status update emails for this ticket, from the customer's link (ADR 0015)" })
  @ApiErrors(HttpStatus.NOT_FOUND)
  stopNotifications(@Param("code") code: string) {
    return this.tracking.stopNotifications(code);
  }

  @Post(":code/collected")
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "The customer says they already picked the item up, stops its reminders (ADR 0028)" })
  @ApiErrors(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  markCollected(@Param("code") code: string) {
    return this.tracking.markCollected(code);
  }

  @Post(":code/feedback")
  @HttpCode(204)
  // Each one emails the shop's Owner and Admins.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "The customer tells the shop privately how it went, once per ticket (ADR 0027)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  sendFeedback(@Param("code") code: string, @Body() dto: SendFeedbackDto) {
    return this.tracking.sendFeedback(code, dto.message);
  }
}
