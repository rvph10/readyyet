import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { MembershipService } from "./membership.service";

@ApiTags("Memberships")
@Controller("locations/:locationId/memberships")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get()
  @ApiOperation({ summary: "List a location's members" })
  list(@Param("locationId") locationId: string) {
    return this.membership.list(locationId);
  }

  @Patch(":membershipId")
  @ApiOperation({ summary: "Change a member's role (ADMIN/EMPLOYEE only, not the owner)" })
  updateRole(
    @Param("locationId") locationId: string,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.membership.updateRole(locationId, membershipId, dto);
  }

  @Delete(":membershipId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a member's access (not the owner)" })
  remove(@Param("locationId") locationId: string, @Param("membershipId") membershipId: string) {
    return this.membership.remove(locationId, membershipId);
  }
}
