import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationModule } from "../notification/notification.module";
import { StorageModule } from "../storage/storage.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { TicketController } from "./ticket.controller";
import { TicketPhotoController } from "./ticket-photo.controller";
import { TicketPhotoService } from "./ticket-photo.service";
import { TicketService } from "./ticket.service";

@Module({
  imports: [DatabaseModule, WorkflowModule, NotificationModule, BillingModule, StorageModule],
  controllers: [TicketController, TicketPhotoController],
  providers: [TicketService, TicketPhotoService],
})
export class TicketModule {}
