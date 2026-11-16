import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminController } from "./admin.controller";
import { CommissionService } from "./commission.service";
import { OverviewService } from "./overview.service";
import { SalesPartnerController } from "./sales-partner.controller";
import { SalesPartnerService } from "./sales-partner.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController, SalesPartnerController],
  providers: [SalesPartnerService, CommissionService, OverviewService],
})
export class AdminModule {}
