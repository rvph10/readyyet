"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { resendLink } from "./actions";

interface Props {
  locationId: string;
  ticketId: string;
  url: string;
  code: string;
  // Drawn on the server, shown large or behind a button.
  qr: ReactNode;
  // The Customer has no working email, so the code is how they follow along.
  qrFirst: boolean;
  // Where a new copy of the link can go, null when it can't be emailed.
  resendTo: string | null;
}

export function TrackingPanel({ locationId, ticketId, url, code, qr, qrFirst, resendTo }: Props) {
  const t = useTranslations("ticketDetail");
  const toast = useToast();
  const [showQr, setShowQr] = useState(false);
  const [failed, setFailed] = useState<"rateLimited" | "unexpected" | null>(null);
  const [pending, startTransition] = useTransition();

  function resend() {
    setFailed(null);
    startTransition(async () => {
      const result = await orFailure(resendLink(locationId, ticketId));
      if (result.ok) toast({ message: t("resent", { email: resendTo! }) });
      else setFailed(result.code === "RATE_LIMITED" ? "rateLimited" : "unexpected");
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      {qrFirst ? (
        <div className="mb-2 flex items-center gap-4">
          <div className="w-28 shrink-0">{qr}</div>
          <p className="min-w-0 text-p-sm">{t("qrHint")}</p>
        </div>
      ) : (
        <Button onClick={() => setShowQr(true)} className="mb-2 w-full">
          <Icon name="qrcode" className="size-3.5 text-brand" />
          {t("showQr")}
        </Button>
      )}
      <CopyField label={t("trackingLink")} value={url} shown={url.replace(/^https?:\/\//, "")} />
      <CopyField label={t("trackingCode")} value={code} mono />
      {failed && <FormAlert>{t(`resendErrors.${failed}`)}</FormAlert>}
      {resendTo && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          pending={pending}
          pendingLabel={t("resending")}
          onClick={resend}
          className="mt-2 w-full"
        >
          {t("resend")}
        </Button>
      )}
      <Dialog open={showQr} onClose={() => setShowQr(false)} title={t("qrTitle")}>
        <div className="mx-auto mt-2 max-w-72">{qr}</div>
        <p className="mt-3 text-center text-p-sm text-muted">{t("qrHint")}</p>
      </Dialog>
    </div>
  );
}
