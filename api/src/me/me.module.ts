import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
