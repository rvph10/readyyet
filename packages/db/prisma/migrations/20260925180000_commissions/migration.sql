-- CreateTable
CREATE TABLE "commission" (
    "id" BIGSERIAL NOT NULL,
    "sales_partner_id" TEXT NOT NULL,
    "business_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "invoice_paid_at" TIMESTAMP(3) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_stripe_invoice_id_key" ON "commission"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "commission_sales_partner_id_invoice_paid_at_idx" ON "commission"("sales_partner_id", "invoice_paid_at");

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_sales_partner_id_fkey" FOREIGN KEY ("sales_partner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

