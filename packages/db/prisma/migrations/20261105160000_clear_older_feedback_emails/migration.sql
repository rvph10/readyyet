-- Staff copies of private feedback from before they knew their Ticket: nothing
-- in them leads back to it, so an erasure could never reach them. Staff have
-- read them or can read the feedback itself, the copy has no use left.
UPDATE "email_log" SET
  "subject" = '[deleted]',
  "html" = NULL,
  "text" = NULL,
  "last_error" = NULL,
  "last_event" = NULL,
  "gave_up_at" = COALESCE("gave_up_at", CURRENT_TIMESTAMP)
WHERE "type" = 'feedback_received'
  AND "ticket_id" IS NULL;
