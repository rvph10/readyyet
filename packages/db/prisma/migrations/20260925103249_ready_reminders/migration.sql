-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "customer_collected_at" TIMESTAMP(3),
ADD COLUMN     "next_ready_reminder_at" TIMESTAMP(3),
ADD COLUMN     "ready_reminders_sent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ticket_next_ready_reminder_at_idx" ON "ticket"("next_ready_reminder_at");
