-- The subscription table has never held a row (nothing reads or writes it
-- before ADR 0033), so it's recreated instead of converted.
DROP TABLE "subscription";
DROP TYPE "Plan";
DROP TYPE "SubscriptionStatus";

CREATE TYPE "Plan" AS ENUM ('ESSENTIEL', 'PRO');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'ENDED');

ALTER TABLE "business" ADD COLUMN "stripe_customer_id" TEXT;
CREATE UNIQUE INDEX "business_stripe_customer_id_key" ON "business"("stripe_customer_id");

CREATE TABLE "subscription" (
    "location_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "plan" "Plan",
    "interval" "BillingInterval",
    "trial_ends_at" TIMESTAMP(3),
    "trial_reminder_sent_at" TIMESTAMP(3),
    "stripe_subscription_id" TEXT,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_plan" "Plan",
    "scheduled_interval" "BillingInterval",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("location_id")
);

CREATE UNIQUE INDEX "subscription_stripe_subscription_id_key" ON "subscription"("stripe_subscription_id");

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
