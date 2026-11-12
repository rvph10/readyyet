import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { InsightsDto, MemberInsightsDto } from "./dto/insights.response.dto";
import { InsightsService } from "./insights.service";

// On every plan and for every Role (ADR 0116).
@ApiTags("Insights")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/insights")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  @ApiOperation({ summary: "A Location's setup, month in numbers and latest activity, for Today (ADR 0116)" })
  get(@Param("locationId") locationId: string): Promise<InsightsDto> {
    return this.insights.get(locationId);
  }

  @Get("members/:userId")
  @ApiOperation({ summary: "What a current member did at this Location, this month and in all (ADR 0142)" })
  member(@Param("locationId") locationId: string, @Param("userId") userId: string): Promise<MemberInsightsDto> {
    return this.insights.member(locationId, userId);
  }
}
