import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { RetentionService } from "./retention.service";

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [RetentionService],
})
export class RetentionModule {}
