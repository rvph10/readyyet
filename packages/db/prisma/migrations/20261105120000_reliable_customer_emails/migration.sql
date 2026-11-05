-- ADR 0081: the ticket-created email is due in the same transaction as its
-- Ticket, and an email that's given up on stays marked.
ALTER TABLE "ticket" ADD COLUMN "tracking_email_due_at" TIMESTAMP(3);
CREATE INDEX "ticket_tracking_email_due_at_idx" ON "ticket"("tracking_email_due_at");
ALTER TABLE "email_log" ADD COLUMN "gave_up_at" TIMESTAMP(3);
