-- AlterTable
ALTER TABLE "location" ADD COLUMN     "turnaround_days" INTEGER;

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "customer_told_ready_date" DATE,
ADD COLUMN     "estimated_ready_date" DATE,
ADD COLUMN     "ready_date_email_due_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ticket_ready_date_email_due_at_idx" ON "ticket"("ready_date_email_due_at");

ALTER TABLE "location" ADD CONSTRAINT "location_turnaround_days_range" CHECK ("turnaround_days" BETWEEN 1 AND 60);
