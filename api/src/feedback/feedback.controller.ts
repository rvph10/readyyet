import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { FeedbackDto, FeedbackPageDto } from "./dto/feedback.response.dto";
import { ListFeedbackQueryDto } from "./dto/list-feedback.query.dto";
import { FeedbackService } from "./feedback.service";

// Readable on any plan: the feedback already received is the shop's data (ADR 0039).
@ApiTags("Feedback")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/feedback")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: "List the private feedback Customers sent, newest first (ADR 0027)" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@Param("locationId") locationId: string, @Query() query: ListFeedbackQueryDto): Promise<FeedbackPageDto> {
    return this.feedback.list(locationId, query);
  }

  @Post(":feedbackId/handled")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a piece of feedback as dealt with" })
  markHandled(
    @Param("locationId") locationId: string,
    @Param("feedbackId") feedbackId: string,
    @CurrentUser() user: User,
  ): Promise<FeedbackDto> {
    return this.feedback.markHandled(locationId, feedbackId, user.id);
  }
}
