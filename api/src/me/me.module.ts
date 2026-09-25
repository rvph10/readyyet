import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { StorageModule } from "../storage/storage.module";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

@Module({
  imports: [DatabaseModule, EmailModule, StorageModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
