"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { TicketForm } from "./ticket-form";

export interface NewTicketProps {
  locationId: string;
  timeZone: string;
  today: string;
  // The Location's turnaround date (ADR 0036), or empty without one.
  suggestedDate: string;
  // The Location's language, which applies to a Customer left on it.
  locationLocale: string;
  country: string | undefined;
}

export interface CreatedTicket {
  id: string;
  title: string;
  customerName: string;
  trackingUrl: string;
}

// A panel, not a page: the counter keeps its list behind it. It ends on the QR
// code, the moment a Customer standing there needs it.
export function NewTicketPanel({ onClose, ...props }: NewTicketProps & { onClose: () => void }) {
  const t = useTranslations("tickets.created");
  const router = useRouter();
  const [created, setCreated] = useState<CreatedTicket | null>(null);

  if (!created) {
    return <TicketForm {...props} onCreated={setCreated} onCancel={onClose} />;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-6 text-center md:px-7">
        <p className="text-title-h4">{t("title")}</p>
        <p className="mt-1 max-w-sm text-p-sm text-muted">{t("hint")}</p>
        <div className="mt-6 w-full max-w-72 rounded-sheet bg-brand p-4">
          <QrCode value={created.trackingUrl} label={t("qrLabel", { name: created.customerName })} className="w-full" />
        </div>
        <p className="mt-4 text-label-md wrap-anywhere">{created.title}</p>
        <p className="text-p-sm wrap-anywhere text-muted">{created.customerName}</p>
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
        <Button onClick={onClose} className="flex-1">
          {t("done")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            router.push(`/locations/${props.locationId}/tickets/${created.id}`);
          }}
        >
          {t("open")}
        </Button>
      </div>
    </>
  );
}
