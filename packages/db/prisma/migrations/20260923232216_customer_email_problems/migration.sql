-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "email_bounced_at" TIMESTAMP(3),
ADD COLUMN     "email_complained_at" TIMESTAMP(3);
