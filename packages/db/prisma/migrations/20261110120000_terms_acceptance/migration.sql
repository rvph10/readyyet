-- ADR 0130: the proof each Business accepted the terms, version by version.
CREATE TABLE "terms_acceptance" (
    "id" BIGSERIAL NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "terms_acceptance_business_id_version_key" ON "terms_acceptance"("business_id", "version");
CREATE INDEX "terms_acceptance_user_id_idx" ON "terms_acceptance"("user_id");

ALTER TABLE "terms_acceptance" ADD CONSTRAINT "terms_acceptance_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terms_acceptance" ADD CONSTRAINT "terms_acceptance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
