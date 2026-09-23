import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationService } from "./invitation.service";

@Controller("locations/:locationId/invitations")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class InvitationController {
  constructor(private readonly invitation: InvitationService) {}

  @Post()
  create(@Param("locationId") locationId: string, @CurrentUser() user: User, @Body() dto: CreateInvitationDto) {
    return this.invitation.create(locationId, user.id, dto);
  }

  @Get()
  list(@Param("locationId") locationId: string) {
    return this.invitation.list(locationId);
  }

  @Post(":invitationId/revoke")
  revoke(@Param("locationId") locationId: string, @Param("invitationId") invitationId: string) {
    return this.invitation.revoke(locationId, invitationId);
  }
}
