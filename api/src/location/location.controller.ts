import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CheckReviewLinkDto, ReviewLinkCheckDto } from "./dto/check-review-link.dto";
import { LocationDto } from "./dto/location.response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationService } from "./location.service";
import { checkReviewLink } from "./review-link-check";

@ApiTags("Locations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get(":locationId")
  // Asked on every load of the Ticket list, so the same room as that route.
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get a location's own fields" })
  findOne(@Param("locationId") locationId: string): Promise<LocationDto> {
    return this.location.findById(locationId);
  }

  @Patch(":locationId")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Update a location's settings" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.PAYMENT_REQUIRED, "PLAN_REQUIRED: a Google review link needs Pro")
  update(@Param("locationId") locationId: string, @Body() dto: UpdateLocationDto): Promise<LocationDto> {
    return this.location.update(locationId, dto);
  }

  @Post(":locationId/review-link/check")
  @HttpCode(HttpStatus.OK)
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  // Each one is a few calls to Google, made on someone's behalf.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Follow a Google review link to see if it still leads somewhere (ADR 0109)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async checkReviewLink(@Body() dto: CheckReviewLinkDto): Promise<ReviewLinkCheckDto> {
    return { result: await checkReviewLink(dto.url) };
  }

  @Delete(":locationId")
  @LocationRoles(Role.OWNER)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a location for good, owner only (ADR 0017)" })
  remove(@Param("locationId") locationId: string) {
    return this.location.remove(locationId);
  }
}
