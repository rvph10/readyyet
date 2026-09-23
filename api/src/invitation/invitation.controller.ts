import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationService } from "./invitation.service";

@ApiTags("Invitations")
@Controller("locations/:locationId/invitations")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class InvitationController {
  constructor(private readonly invitation: InvitationService) {}

  @Post()
  @ApiOperation({ summary: "Invite someone by email to a location with a role (an admin invites employees only)" })
  create(@Param("locationId") locationId: string, @CurrentUser() user: User, @Body() dto: CreateInvitationDto) {
    return this.invitation.create(locationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List invitations for a location" })
  list(@Param("locationId") locationId: string) {
    return this.invitation.list(locationId);
  }

  @Post(":invitationId/revoke")
  @ApiOperation({ summary: "Revoke a pending invitation (an admin revokes employee invitations only)" })
  revoke(
    @Param("locationId") locationId: string,
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitation.revoke(locationId, user.id, invitationId);
  }
}
