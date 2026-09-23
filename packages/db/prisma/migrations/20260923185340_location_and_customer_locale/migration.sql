-- AlterTable
ALTER TABLE "customer" ADD COLUMN "locale" "Locale";

-- AlterTable: backfill before NOT NULL, so this also applies to a
-- database that already has locations. EN is only a placeholder for
-- those existing rows, the API requires an explicit locale from now on.
ALTER TABLE "location" ADD COLUMN "locale" "Locale";
UPDATE "location" SET "locale" = 'EN';
ALTER TABLE "location" ALTER COLUMN "locale" SET NOT NULL;
