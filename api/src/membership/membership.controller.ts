import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Put, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { MemberDto } from "./dto/membership.response.dto";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { UpdateSetupGuideDto } from "./dto/update-setup-guide.dto";
import { MembershipService } from "./membership.service";

@ApiTags("Memberships")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/memberships")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  // A Business's pages read every Location's, so a chain goes through this many
  // times per page, and each one is the same counter (ADR 0102).
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
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

  @Put("me/setup-guide")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hide or show the shop's setup guide for yourself (ADR 0117)" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  updateSetupGuide(
    @Param("locationId") locationId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateSetupGuideDto,
  ): Promise<void> {
    return this.membership.updateSetupGuide(locationId, user.id, dto.hidden);
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
