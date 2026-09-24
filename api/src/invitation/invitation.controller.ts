import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationDto } from "./dto/invitation.response.dto";
import { InvitationService } from "./invitation.service";

@ApiTags("Invitations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@Controller("locations/:locationId/invitations")
@LocationRoles(Role.OWNER, Role.ADMIN)
@UseGuards(LocationMembershipGuard)
export class InvitationController {
  constructor(private readonly invitation: InvitationService) {}

  @Post()
  @ApiOperation({ summary: "Invite someone by email to a location with a role (an admin invites employees only)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(
    @Param("locationId") locationId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    return this.invitation.create(locationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List invitations for a location" })
  list(@Param("locationId") locationId: string): Promise<InvitationDto[]> {
    return this.invitation.list(locationId);
  }

  @Post(":invitationId/revoke")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a pending invitation (an admin revokes employee invitations only)" })
  @ApiErrors(HttpStatus.CONFLICT)
  revoke(
    @Param("locationId") locationId: string,
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: User,
  ): Promise<InvitationDto> {
    return this.invitation.revoke(locationId, user.id, invitationId);
  }

  @Post(":invitationId/resend")
  @HttpCode(HttpStatus.OK)
  // Each call sends an email, same limit as resending a tracking link.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Email a pending invitation again, extending its expiry (ADR 0017)" })
  @ApiErrors(HttpStatus.CONFLICT)
  resend(
    @Param("locationId") locationId: string,
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: User,
  ): Promise<InvitationDto> {
    return this.invitation.resend(locationId, user.id, invitationId);
  }
}
