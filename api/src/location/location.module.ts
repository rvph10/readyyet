import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { LocationController } from "./location.controller";
import { LocationService } from "./location.service";

@Module({
  imports: [DatabaseModule, BillingModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
