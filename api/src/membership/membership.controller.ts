import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { MemberDto } from "./dto/membership.response.dto";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { MembershipService } from "./membership.service";

@ApiTags("Memberships")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@Controller("locations/:locationId/memberships")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get()
  @ApiOperation({ summary: "List a location's members" })
  list(@Param("locationId") locationId: string): Promise<MemberDto[]> {
    return this.membership.list(locationId);
  }

  // Declared before :membershipId so "me" isn't read as an id. Open to
  // every role, unlike the rest of this controller.
  @Delete("me")
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Leave this location, removing your own membership (not the owner, ADR 0017)" })
  @ApiErrors(HttpStatus.CONFLICT)
  leave(@Param("locationId") locationId: string, @CurrentUser() user: User) {
    return this.membership.leave(locationId, user.id);
  }

  @Patch(":membershipId")
  @ApiOperation({ summary: "Change a member's role between ADMIN and EMPLOYEE (owner only, ADR 0017)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  updateRole(
    @Param("locationId") locationId: string,
    @Param("membershipId") membershipId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateMembershipRoleDto,
  ): Promise<MemberDto> {
    return this.membership.updateRole(locationId, user.id, membershipId, dto);
  }

  @Delete(":membershipId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a member's access (not the owner, an admin removes employees only)" })
  @ApiErrors(HttpStatus.CONFLICT)
  remove(
    @Param("locationId") locationId: string,
    @Param("membershipId") membershipId: string,
    @CurrentUser() user: User,
  ) {
    return this.membership.remove(locationId, user.id, membershipId);
  }
}
