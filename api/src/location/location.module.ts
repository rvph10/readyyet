import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LocationController } from "./location.controller";
import { LocationService } from "./location.service";

@Module({
  imports: [DatabaseModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
