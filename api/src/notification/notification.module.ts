import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { NotificationService } from "./notification.service";

@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
