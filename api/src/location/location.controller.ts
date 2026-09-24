import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { LocationDto } from "./dto/location.response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationService } from "./location.service";

@ApiTags("Locations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get(":locationId")
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
  update(@Param("locationId") locationId: string, @Body() dto: UpdateLocationDto): Promise<LocationDto> {
    return this.location.update(locationId, dto);
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
