import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StripeWebhookController } from "./stripe-webhook.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService],
})
export class BillingModule {}
