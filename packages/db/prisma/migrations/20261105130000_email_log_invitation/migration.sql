-- An invitation's email knows its invitation, so a late retry can check it
-- wasn't revoked.
ALTER TABLE "email_log" ADD COLUMN "invitation_id" UUID;
CREATE INDEX "email_log_invitation_id_idx" ON "email_log"("invitation_id");
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
