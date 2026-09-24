import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { BusinessController } from "./business.controller";
import { BusinessService } from "./business.service";

@Module({
  imports: [DatabaseModule, EmailModule, BillingModule],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
