-- CreateTable
CREATE TABLE "pending_status_notification" (
    "status_event_id" BIGINT NOT NULL,
    "send_after" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_status_notification_pkey" PRIMARY KEY ("status_event_id")
);

-- CreateIndex
CREATE INDEX "pending_status_notification_send_after_idx" ON "pending_status_notification"("send_after");

-- AddForeignKey
ALTER TABLE "pending_status_notification" ADD CONSTRAINT "pending_status_notification_status_event_id_fkey" FOREIGN KEY ("status_event_id") REFERENCES "ticket_status_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
