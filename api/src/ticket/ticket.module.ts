import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationModule } from "../notification/notification.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { TicketController } from "./ticket.controller";
import { TicketService } from "./ticket.service";

@Module({
  imports: [DatabaseModule, WorkflowModule, NotificationModule, BillingModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
