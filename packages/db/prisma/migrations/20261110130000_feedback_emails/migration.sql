-- ADR 0131: the feedback email is each shop's choice, off until it makes it,
-- Locations that sent it until now included.
ALTER TABLE "location" ADD COLUMN "feedback_emails" BOOLEAN NOT NULL DEFAULT false;
