-- ADR 0051: the logo is the Business's, shown for all its Locations. Each
-- Business keeps its oldest live Location's logo, the others' objects are
-- left for the orphan-images sweep (ADR 0038).
ALTER TABLE "business" ADD COLUMN "logo_key" TEXT;

UPDATE "business" SET "logo_key" = (
  SELECT "location"."logo_key" FROM "location"
  WHERE "location"."business_id" = "business"."id"
    AND "location"."logo_key" IS NOT NULL
    AND "location"."deleted_at" IS NULL
  ORDER BY "location"."created_at"
  LIMIT 1
);

ALTER TABLE "location" DROP COLUMN "logo_key";

-- ADR 0051: an invitee can decline.
ALTER TYPE "InvitationStatus" ADD VALUE 'DECLINED';
