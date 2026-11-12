-- ADR 0131: the feedback email is each shop's choice, off until it makes it,
-- Locations that sent it until now included. When it was turned on, so only
-- Tickets told about it at drop-off get it (ADR 0139).
ALTER TABLE "location" ADD COLUMN "feedback_emails_since" TIMESTAMP(3);
