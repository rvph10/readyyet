"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { QrCode } from "@/components/qr-code";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

const share =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-surface/10 text-label-sm text-surface transition-colors hover:bg-surface/20";

// Like an Owner's invite (ADR 0110): nobody reads or types the address, so it
// stays out of sight behind the ways to pass it on.
export function LinkActions({ link }: { link: string }) {
  const t = useTranslations("salesPartner.link");
  const message = t("message", { link });

  return (
    <div className="flex flex-col gap-2">
      <CopyButton
        value={link}
        label={t("copy")}
        copiedLabel={t("copied")}
        variant="secondary"
        className="w-full border-0"
      />
      <div className="flex gap-2">
        <a
          href={`mailto:?subject=${encodeURIComponent(t("subject"))}&body=${encodeURIComponent(message)}`}
          className={share}
        >
          <Icon name="message" className="size-3.5" />
          {t("byEmail")}
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={share}
        >
          <Icon name="comment" className="size-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

// Big enough to scan across a counter, with the phone held out to the shop.
export function ZoomableQr({ link }: { link: string }) {
  const t = useTranslations("salesPartner.link");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("zoom")}
        className="group relative cursor-zoom-in rounded-2xl transition-transform active:scale-[0.97]"
      >
        <QrCode value={link} label={t("qr")} className="size-40 border-0" />
        <span className="absolute -right-2 -bottom-2 flex size-9 items-center justify-center rounded-full bg-brand text-ink ring-4 ring-pine transition-colors group-hover:bg-brand-hover">
          <Icon name="view" className="size-3.5" />
        </span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        variant="image"
        title={t("qrHint")}
        media={<QrCode value={link} label={t("qr")} className="mx-auto w-full max-w-[min(32rem,80dvh)] border-0" />}
      />
    </>
  );
}
