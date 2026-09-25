-- AlterTable
ALTER TABLE "business" ADD COLUMN     "paid_from" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sponsor_credit" (
    "business_id" UUID NOT NULL,
    "sponsor_business_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "invoice_paid_at" TIMESTAMP(3) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "credited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_credit_pkey" PRIMARY KEY ("business_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_credit_stripe_invoice_id_key" ON "sponsor_credit"("stripe_invoice_id");

-- AddForeignKey
ALTER TABLE "sponsor_credit" ADD CONSTRAINT "sponsor_credit_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_credit" ADD CONSTRAINT "sponsor_credit_sponsor_business_id_fkey" FOREIGN KEY ("sponsor_business_id") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
