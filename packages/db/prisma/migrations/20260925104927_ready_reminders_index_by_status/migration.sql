-- DropIndex
DROP INDEX "ticket_next_ready_reminder_at_idx";

-- CreateIndex
CREATE INDEX "ticket_current_status_id_next_ready_reminder_at_idx" ON "ticket"("current_status_id", "next_ready_reminder_at");
