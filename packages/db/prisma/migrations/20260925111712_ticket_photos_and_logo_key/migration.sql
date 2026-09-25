-- ADR 0038: a logo and an avatar are now uploaded, their columns hold a
-- key in the bucket. Links typed in before aren't copied into the bucket,
-- staging's data is throwaway and production has no Location yet.
-- AlterTable
ALTER TABLE "location" DROP COLUMN "logo_url",
ADD COLUMN     "logo_key" TEXT;

-- CreateTable
CREATE TABLE "ticket_photo" (
    "id" BIGSERIAL NOT NULL,
    "ticket_id" BIGINT NOT NULL,
    "object_key" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_photo_object_key_key" ON "ticket_photo"("object_key");

-- CreateIndex
CREATE INDEX "ticket_photo_ticket_id_created_at_idx" ON "ticket_photo"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "ticket_photo" ADD CONSTRAINT "ticket_photo_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_photo" ADD CONSTRAINT "ticket_photo_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only Better Auth's own update route could have set it, to any string.
UPDATE "user" SET "image" = NULL;
