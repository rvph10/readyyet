-- Existing Locations are all in Belgium, the default only fills them in.
ALTER TABLE "location"
  ADD COLUMN "street_address" TEXT,
  ADD COLUMN "postal_code" TEXT,
  ADD COLUMN "address_locality" TEXT,
  ADD COLUMN "address_country" TEXT,
  ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'Europe/Brussels',
  ADD COLUMN "opening_hours" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "location" ALTER COLUMN "time_zone" DROP DEFAULT;

ALTER TABLE "location" ADD CONSTRAINT "location_address_complete" CHECK (
  num_nonnulls("street_address", "postal_code", "address_locality", "address_country") IN (0, 4)
);
