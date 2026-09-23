import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailRetryService } from "./email-retry.service";
import { EmailWebhookController } from "./email-webhook.controller";
import { EmailService } from "./email.service";

@Module({
  imports: [DatabaseModule],
  controllers: [EmailWebhookController],
  providers: [EmailService, EmailRetryService],
  exports: [EmailService],
})
export class EmailModule {}
