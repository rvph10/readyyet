-- ADR 0127: files sent with an email, kept for its retries.
ALTER TABLE "email_log" ADD COLUMN "attachments" JSONB;
