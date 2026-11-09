"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/components/ui/use-copy";
import { orFailure } from "@/lib/api/or-failure";
import { resendLink } from "./actions";

interface Props {
  locationId: string;
  ticketId: string;
  url: string;
  code: string;
  // Drawn on the server, small in the panel and large to scan or print.
  qr: ReactNode;
  // What the printed slip says under the code.
  shopName: string;
  title: string;
  customerName: string;
  // In the Customer's language: the message that carries the link, and the
  // line under the large QR code, which the Customer reads at the counter.
  shareText: string;
  scanText: string;
  // In E.164, null without one.
  phone: string | null;
  // Where a new copy of the link can go, null when it can't be emailed.
  resendTo: string | null;
}

// Read aloud or typed from a slip, a long code is easier in groups of four.
function grouped(code: string) {
  return code.match(/.{1,4}/g)!.join(" ");
}

// The link itself is never shown: it's long and means nothing to anyone. Staff
// hand it on by QR, a copy, a message or a printed slip.
export function TrackingPanel({
  locationId,
  ticketId,
  url,
  code,
  qr,
  shopName,
  title,
  customerName,
  shareText,
  scanText,
  phone,
  resendTo,
}: Props) {
  const t = useTranslations("ticketDetail");
  const toast = useToast();
  const { copied, copy } = useCopy();
  const [showQr, setShowQr] = useState(false);
  const [failed, setFailed] = useState<"rateLimited" | "unexpected" | null>(null);
  const [pending, startTransition] = useTransition();
  const message = encodeURIComponent(shareText);

  async function copyLink() {
    if (!(await copy(url))) toast({ tone: "error", message: t("copyFailed") });
  }

  function resend() {
    setFailed(null);
    startTransition(async () => {
      const result = await orFailure(resendLink(locationId, ticketId));
      if (result.ok) toast({ message: t("resent", { email: resendTo! }) });
      else setFailed(result.code === "RATE_LIMITED" ? "rateLimited" : "unexpected");
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <button
        type="button"
        onClick={() => setShowQr(true)}
        className="group flex cursor-zoom-in items-center gap-4 rounded-2xl text-left"
      >
        <span className="relative w-28 shrink-0">
          {qr}
          <span className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full bg-pine text-brand transition-transform group-hover:scale-110">
            <Icon name="view" className="size-3.5" />
          </span>
        </span>
        <span className="min-w-0">
          <span aria-hidden="true" className="block text-p-sm">
            {t("qrHint")}
          </span>
          <span className="mt-1 block text-label-sm underline-offset-4 group-hover:underline">{t("showQr")}</span>
        </span>
      </button>

      <CopyField label={t("trackingCode")} value={code} shown={grouped(code)} mono />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copyLink()} className="flex-1">
          <Icon name={copied ? "check" : "link"} className="size-3.5" />
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>
        <p aria-live="polite" className="sr-only">
          {copied ? t("linkCopied") : ""}
        </p>
        {phone && (
          <a
            href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonClass({ variant: "secondary", size: "sm" })} flex-1`}
          >
            <Icon name="comment" className="size-3.5" />
            WhatsApp
          </a>
        )}
        {/* Only where a tap opens a messaging app: on a computer sms: goes nowhere. */}
        {phone && (
          <a
            href={`sms:${phone}?&body=${message}`}
            className={`${buttonClass({ variant: "secondary", size: "sm" })} flex-1 pointer-fine:hidden`}
          >
            <Icon name="message" className="size-3.5" />
            {t("sendSms")}
          </a>
        )}
      </div>

      {failed && <FormAlert>{t(`resendErrors.${failed}`)}</FormAlert>}
      {resendTo && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          pending={pending}
          pendingLabel={t("resending")}
          onClick={resend}
          className="w-full"
        >
          <Icon name="message" className="size-3.5" />
          {t("resend")}
        </Button>
      )}

      <Dialog open={showQr} onClose={() => setShowQr(false)} title={t("qrTitle")}>
        <div className="print-sheet flex flex-col items-center text-center">
          <div className="mt-2 w-full max-w-72">{qr}</div>
          <p className="mt-4 text-label-lg wrap-anywhere">{title}</p>
          <p className="text-p-sm wrap-anywhere text-muted">
            {customerName}, {shopName}
          </p>
          <p className="mt-3 rounded-full bg-subtle px-4 py-1.5 font-mono text-label-md font-semibold tracking-wide">
            {grouped(code)}
          </p>
          <p className="mt-3 max-w-xs text-p-sm text-muted">{scanText}</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="mt-5 w-full">
          <Icon name="receipt" className="size-3.5" />
          {t("printSlip")}
        </Button>
      </Dialog>
    </div>
  );
}
