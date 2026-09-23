import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { InvitationAcceptController } from "./invitation-accept.controller";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [InvitationController, InvitationAcceptController],
  providers: [InvitationService],
})
export class InvitationModule {}
