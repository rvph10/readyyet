import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationService } from "./location.service";

@ApiTags("Locations")
@Controller("locations")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get(":locationId")
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get a location's own fields" })
  findOne(@Param("locationId") locationId: string) {
    return this.location.findById(locationId);
  }

  @Patch(":locationId")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Update a location's settings" })
  update(@Param("locationId") locationId: string, @Body() dto: UpdateLocationDto) {
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
