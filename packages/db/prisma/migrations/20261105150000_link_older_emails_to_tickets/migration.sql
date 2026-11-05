-- Emails from before ADR 0081 have no Ticket, so a Customer's erasure can't
-- reach them. Every one of them links to its Ticket's tracking page.
UPDATE "email_log" e SET "ticket_id" = t."id"
FROM "ticket" t
WHERE e."ticket_id" IS NULL
  AND e."type" LIKE 'ticket\_%'
  AND e."html" LIKE '%/t/' || t."tracking_code" || '%';

-- Customers erased before erasure reached the emails about them.
UPDATE "email_log" e SET
  "to" = 'erased@deleted.invalid',
  "subject" = '[deleted]',
  "html" = NULL,
  "text" = NULL,
  "last_error" = NULL,
  "last_event" = NULL,
  "gave_up_at" = COALESCE(e."gave_up_at", CURRENT_TIMESTAMP)
FROM "ticket" t
JOIN "customer" c ON c."id" = t."customer_id"
WHERE e."ticket_id" = t."id"
  AND c."deleted_at" IS NOT NULL;
