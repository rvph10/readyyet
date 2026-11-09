-- AlterTable
ALTER TABLE "user" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "sales_partner_since" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "business" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by_business_id" UUID,
ADD COLUMN     "referred_by_sales_partner_id" TEXT;

-- Existing Businesses get their sponsor code too: 8 base64url characters
-- from the random bytes of a v4 uuid, the same shape the API generates.
UPDATE "business" SET "referral_code" = left(translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/', '-_'), 8);
ALTER TABLE "business" ALTER COLUMN "referral_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_referral_code_key" ON "user"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "business_referral_code_key" ON "business"("referral_code");

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_referred_by_business_id_fkey" FOREIGN KEY ("referred_by_business_id") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_referred_by_sales_partner_id_fkey" FOREIGN KEY ("referred_by_sales_partner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business" ADD CONSTRAINT "business_one_referrer" CHECK ("referred_by_business_id" IS NULL OR "referred_by_sales_partner_id" IS NULL);
