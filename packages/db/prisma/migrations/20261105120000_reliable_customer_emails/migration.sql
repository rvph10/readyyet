-- ADR 0081: the ticket-created email is due in the same transaction as its
-- Ticket, and an email knows its Ticket and whether it was given up on.
ALTER TABLE "ticket" ADD COLUMN "tracking_email_due_at" TIMESTAMP(3);
CREATE INDEX "ticket_tracking_email_due_at_idx" ON "ticket"("tracking_email_due_at");

ALTER TABLE "email_log" ADD COLUMN "gave_up_at" TIMESTAMP(3);
ALTER TABLE "email_log" ADD COLUMN "dedupe_key" TEXT;
ALTER TABLE "email_log" ADD COLUMN "ticket_id" BIGINT;
CREATE UNIQUE INDEX "email_log_dedupe_key_key" ON "email_log"("dedupe_key");
CREATE INDEX "email_log_ticket_id_idx" ON "email_log"("ticket_id");
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- What the old sweep had already stopped retrying stays stopped.
UPDATE "email_log" SET "gave_up_at" = CURRENT_TIMESTAMP
WHERE "status" IN ('QUEUED', 'FAILED')
  AND "type" <> 'auth_otp'
  AND ("attempts" >= 9 OR "created_at" < CURRENT_TIMESTAMP - INTERVAL '1 day');
