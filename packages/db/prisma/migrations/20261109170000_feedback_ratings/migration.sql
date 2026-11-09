-- AlterTable
ALTER TABLE "ticket_feedback" ADD COLUMN     "google_clicked_at" TIMESTAMP(3),
ADD COLUMN     "replied_at" TIMESTAMP(3),
ADD COLUMN     "reply" TEXT,
ADD COLUMN     "stars" SMALLINT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "message" DROP NOT NULL;

ALTER TABLE "ticket_feedback" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_stars_range" CHECK ("stars" BETWEEN 1 AND 5);
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_has_answer" CHECK ("stars" IS NOT NULL OR "message" IS NOT NULL);
