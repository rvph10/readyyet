import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { TrialReminderService } from "./trial-reminder.service";

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, TrialReminderService],
  exports: [BillingService],
})
export class BillingModule {}
