import { Controller, Get, Header, HttpStatus, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { InvitationPreviewDto } from "./dto/invitation.response.dto";
import { InvitationService } from "./invitation.service";

// The page an invitation link opens, before sign-in: who invites, to what,
// and which address to sign in with (ADR 0051). Accepting and declining
// stay on InvitationAcceptController, behind the email-match check.
@ApiTags("Invitations")
@AllowAnonymous()
@ApiErrors(HttpStatus.TOO_MANY_REQUESTS)
@Controller("invitations")
export class InvitationPreviewController {
  constructor(private readonly invitation: InvitationService) {}

  @Get(":invitationId/preview")
  // Like the tracking page, the other public read: a visitor never needs more.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Public view of an invitation, for its link's page before sign-in" })
  @ApiErrors(HttpStatus.NOT_FOUND)
  preview(@Param("invitationId") invitationId: string): Promise<InvitationPreviewDto> {
    return this.invitation.preview(invitationId);
  }
}
