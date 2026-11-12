-- An email to a Customer not sent because its Location reached its daily limit (ADR 0140).
ALTER TYPE "EmailStatus" ADD VALUE 'LIMITED';

-- The sign-in codes an address got in the last hour.
CREATE INDEX "email_log_to_created_at_idx" ON "email_log"("to", "created_at");
