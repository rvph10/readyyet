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
  // Drawn on the server, shown large or behind a button.
  qr: ReactNode;
  // The Customer has no working email, so the code is how they follow along.
  qrFirst: boolean;
  // Where a new copy of the link can go, null when it can't be emailed.
  resendTo: string | null;
}

export function TrackingPanel({ locationId, ticketId, url, qr, qrFirst, resendTo }: Props) {
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
    <div className="flex flex-col gap-4">
      {qrFirst && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-64">{qr}</div>
          <p className="text-center text-p-sm text-muted">{t("qrHint")}</p>
        </div>
      )}
      <CopyField label={t("trackingLink")} value={url} />
      {failed && <FormAlert>{t(`resendErrors.${failed}`)}</FormAlert>}
      {(!qrFirst || resendTo) && (
        <div className="flex flex-col gap-3">
          {!qrFirst && (
            <Button variant="secondary" onClick={() => setShowQr(true)}>
              <Icon name="qrcode" className="size-3.5" />
              {t("showQr")}
            </Button>
          )}
          {resendTo && (
            <Button
              variant="secondary"
              disabled={pending}
              pending={pending}
              pendingLabel={t("resending")}
              onClick={resend}
            >
              {t("resend")}
            </Button>
          )}
        </div>
      )}
      <Dialog open={showQr} onClose={() => setShowQr(false)} title={t("qrTitle")}>
        <div className="mx-auto mt-2 max-w-72">{qr}</div>
        <p className="mt-3 text-center text-p-sm text-muted">{t("qrHint")}</p>
      </Dialog>
    </div>
  );
}
