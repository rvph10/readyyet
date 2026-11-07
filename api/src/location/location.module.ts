import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { LocationController } from "./location.controller";
import { LocationService } from "./location.service";

@Module({
  imports: [DatabaseModule, BillingModule, StorageModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
