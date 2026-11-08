import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { InsightsDto } from "./dto/insights.response.dto";
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
  get(@Param("locationId") locationId: string, @CurrentUser() user: User): Promise<InsightsDto> {
    return this.insights.get(locationId, user.id);
  }
}
