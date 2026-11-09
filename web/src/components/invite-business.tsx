"use client";

import { useTranslations } from "next-intl";
import { useContext, useEffect, useState } from "react";
import { Illustration } from "@/components/illustration";
import { CollapsedContext, wide } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

const COPIED_FOR_MS = 2000;

function Reward({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-label-xs font-semibold">{label}</p>
      <p className="mt-1 text-label-md text-pretty">{value}</p>
    </div>
  );
}

// ADR 0110: what each side gets and three ways to pass it on. The address itself
// is nothing to read, so it stays out of sight.
export function InviteDialog({ link, open, onClose }: { link: string; open: boolean; onClose: () => void }) {
  const t = useTranslations("business.invite");
  const [copied, setCopied] = useState(false);
  const message = t("message", { link });

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const share =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-subtle text-label-sm transition-colors hover:bg-border";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="announcement"
      title={t("title")}
      media={
        <div className="absolute inset-0 flex items-center justify-center bg-pine">
          <Illustration name="trophy-on-pine" className="h-[86%] w-auto" />
        </div>
      }
    >
      <p className="text-p-md text-muted">{t("lead")}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Reward label={t("youLabel")} value={t("you")} tone="bg-brand" />
        <Reward label={t("theyLabel")} value={t("they")} tone="bg-subtle" />
      </div>
      <Button
        className="mt-4 w-full"
        onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}
      >
        <Icon name={copied ? "check" : "link"} className="size-3.5 text-brand" />
        {t(copied ? "copied" : "copy")}
      </Button>
      <div className="mt-2 flex gap-2">
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
      <p className="mt-3 text-p-xs text-muted">{t("when")}</p>
    </Dialog>
  );
}

// ADR 0106: lime and worded like a nav item, as an Owner bringing another shop
// is the cheapest customer we get. A circle on the rail.
export function InviteBusiness({ link }: { link: string }) {
  const t = useTranslations("business.invite");
  const collapsed = useContext(CollapsedContext);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={t("action")}
        onClick={() => setOpen(true)}
        className={`mx-auto flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-full bg-brand text-label-md text-ink transition-[background-color,scale] hover:bg-brand-hover active:scale-[0.97] roomy:h-12 ${
          collapsed
            ? "roomy:w-12"
            : "max-xl:roomy:w-12 xl:mx-0 xl:h-14 xl:w-full xl:justify-start xl:rounded-2xl xl:px-3 roomy:xl:h-14"
        }`}
      >
        <Icon name="link" className="size-5 shrink-0" />
        <span className={`min-w-0 flex-1 text-left ${wide(collapsed)}`}>
          <span className="block truncate">{t("action")}</span>
          <span className="block truncate text-p-xs">{t("actionHint")}</span>
        </span>
      </button>
      <InviteDialog link={link} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// A phone has no sidebar, so it's a row of the User's sheet. The dialog stays
// outside that sheet, which closes on the way.
export function InviteRow({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("business.invite");
  return (
    <button
      type="button"
      data-closes-popover
      onClick={onOpen}
      className="mb-1 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-brand px-3 text-left text-ink"
    >
      <Icon name="link" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-sm">{t("action")}</span>
        <span className="block truncate text-p-xs">{t("actionHint")}</span>
      </span>
    </button>
  );
}
