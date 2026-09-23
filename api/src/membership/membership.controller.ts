import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
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
  @ApiOperation({ summary: "Change a member's role between ADMIN and EMPLOYEE (owner only, ADR 0017)" })
  updateRole(
    @Param("locationId") locationId: string,
    @Param("membershipId") membershipId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.membership.updateRole(locationId, user.id, membershipId, dto);
  }

  @Delete(":membershipId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a member's access (not the owner, an admin removes employees only)" })
  remove(
    @Param("locationId") locationId: string,
    @Param("membershipId") membershipId: string,
    @CurrentUser() user: User,
  ) {
    return this.membership.remove(locationId, user.id, membershipId);
  }
}
