import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { TicketController } from "./ticket.controller";
import { TicketService } from "./ticket.service";

@Module({
  imports: [DatabaseModule, WorkflowModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
