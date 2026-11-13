-- The logo moved to the Business (ADR 0051) and no deployed API reads this
-- column since then; it was kept only so the old API could still select it
-- while that deploy's migrations ran (ADR 0020).
ALTER TABLE "location" DROP COLUMN "logo_key";
