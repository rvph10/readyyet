-- DropForeignKey
ALTER TABLE "ticket" DROP CONSTRAINT "ticket_customer_id_fkey";

-- AlterTable
ALTER TABLE "ticket_status_event" ADD COLUMN     "workflow_id" BIGINT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customer_id_location_id_key" ON "customer"("id", "location_id");

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_customer_id_location_id_fkey" FOREIGN KEY ("customer_id", "location_id") REFERENCES "customer"("id", "location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_workflow_id_current_status_id_fkey" FOREIGN KEY ("workflow_id", "current_status_id") REFERENCES "workflow_step"("workflow_id", "status_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_status_event" ADD CONSTRAINT "ticket_status_event_workflow_id_status_id_fkey" FOREIGN KEY ("workflow_id", "status_id") REFERENCES "workflow_step"("workflow_id", "status_id") ON DELETE RESTRICT ON UPDATE CASCADE;
