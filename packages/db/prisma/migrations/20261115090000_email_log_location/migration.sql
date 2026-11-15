-- ADR 0140's daily limit counted a Location's emails through their Ticket, so
-- deleting a Ticket (ADR 0155) took its emails out of the count.
BEGIN;

ALTER TABLE "email_log" ADD COLUMN "location_id" UUID;

UPDATE "email_log" SET "location_id" = "ticket"."location_id"
FROM "ticket"
WHERE "ticket"."id" = "email_log"."ticket_id";

ALTER TABLE "email_log" ADD CONSTRAINT "email_log_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "email_log_location_id_created_at_idx" ON "email_log"("location_id", "created_at");

COMMIT;
