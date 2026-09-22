import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { LocationService } from "./location.service";

@Controller("locations")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get(":locationId")
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  findOne(@Param("locationId") locationId: string) {
    return this.location.findById(locationId);
  }
}
