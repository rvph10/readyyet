-- AlterTable
ALTER TABLE "location" ADD COLUMN     "google_review_url" TEXT;

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "feedback_email_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ticket_feedback" (
    "id" BIGSERIAL NOT NULL,
    "ticket_id" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "handled_at" TIMESTAMP(3),
    "handled_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_feedback_ticket_id_key" ON "ticket_feedback"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_feedback_created_at_idx" ON "ticket_feedback"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
