import { Module } from "@nestjs/common";
import { ImageController } from "./image.controller";
import { StorageService } from "./storage.service";

@Module({
  controllers: [ImageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
