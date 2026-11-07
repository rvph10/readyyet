import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ImageController } from "./image.controller";
import { ImageSweepService } from "./image-sweep.service";
import { StorageService } from "./storage.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ImageController],
  providers: [StorageService, ImageSweepService],
  exports: [StorageService],
})
export class StorageModule {}
