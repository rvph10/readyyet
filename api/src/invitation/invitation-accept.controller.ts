import { Controller, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MembershipDto } from "../membership/dto/membership.response.dto";
import { InvitationService } from "./invitation.service";

// Deliberately separate from InvitationController: accepting isn't
// scoped by :locationId (the accepting user isn't a member yet, so
// LocationMembershipGuard doesn't apply), it only needs Better Auth's
// already-global AuthGuard plus the email-match check inside the
// service.
@ApiTags("Invitations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("invitations")
export class InvitationAcceptController {
  constructor(private readonly invitation: InvitationService) {}

  @Post(":invitationId/accept")
  @ApiOperation({ summary: "Accept an invitation (creates a real Membership)" })
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  accept(@Param("invitationId") invitationId: string, @CurrentUser() user: User): Promise<MembershipDto> {
    return this.invitation.accept(invitationId, user);
  }
}
