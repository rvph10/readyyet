import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
