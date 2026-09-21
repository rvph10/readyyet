-- DropForeignKey
ALTER TABLE "ticket_status_event" DROP CONSTRAINT "ticket_status_event_ticket_id_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "ticket_id_workflow_id_key" ON "ticket"("id", "workflow_id");

-- AddForeignKey
ALTER TABLE "ticket_status_event" ADD CONSTRAINT "ticket_status_event_ticket_id_workflow_id_fkey" FOREIGN KEY ("ticket_id", "workflow_id") REFERENCES "ticket"("id", "workflow_id") ON DELETE CASCADE ON UPDATE CASCADE;
