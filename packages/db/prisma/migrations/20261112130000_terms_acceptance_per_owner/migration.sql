-- Each Owner accepts for themselves, a new one after a transfer too (ADR 0138).
DROP INDEX "terms_acceptance_business_id_version_key";
CREATE UNIQUE INDEX "terms_acceptance_business_id_version_user_id_key" ON "terms_acceptance"("business_id", "version", "user_id");
