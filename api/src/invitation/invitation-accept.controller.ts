import { Controller, Param, Post } from "@nestjs/common";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { InvitationService } from "./invitation.service";

// Deliberately separate from InvitationController: accepting isn't
// scoped by :locationId (the accepting user isn't a member yet, so
// LocationMembershipGuard doesn't apply), it only needs Better Auth's
// already-global AuthGuard plus the email-match check inside the
// service.
@Controller("invitations")
export class InvitationAcceptController {
  constructor(private readonly invitation: InvitationService) {}

  @Post(":invitationId/accept")
  accept(@Param("invitationId") invitationId: string, @CurrentUser() user: User) {
    return this.invitation.accept(invitationId, user);
  }
}
