import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { InvitationAcceptController } from "./invitation-accept.controller";
import { InvitationPreviewController } from "./invitation-preview.controller";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";

@Module({
  imports: [DatabaseModule, EmailModule, BillingModule],
  controllers: [InvitationController, InvitationAcceptController, InvitationPreviewController],
  providers: [InvitationService],
})
export class InvitationModule {}
