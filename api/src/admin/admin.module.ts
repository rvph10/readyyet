import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminController } from "./admin.controller";
import { SalesPartnerService } from "./sales-partner.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [SalesPartnerService],
})
export class AdminModule {}
