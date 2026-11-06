"use client";

import { useTranslations } from "next-intl";
import { useContext, useState } from "react";
import { Illustration } from "@/components/illustration";
import { CollapsedContext, wide } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Dialog } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icon";

const STEPS: { key: "share" | "they" | "you"; icon: IconName }[] = [
  { key: "share", icon: "link" },
  { key: "they", icon: "tag" },
  { key: "you", icon: "receipt" },
];

function InviteDialog({ link, open, onClose }: { link: string; open: boolean; onClose: () => void }) {
  const t = useTranslations("business.invite");
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
      <ul className="flex flex-col gap-3">
        {STEPS.map(({ key, icon }) => (
          <li key={key} className="flex items-center gap-3 text-p-md">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand">
              <Icon name={icon} className="size-3.5" />
            </span>
            {t(`steps.${key}`)}
          </li>
        ))}
      </ul>
      <CopyField className="mt-5" label={t("link")} value={link} />
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
          collapsed ? "roomy:w-12" : "max-xl:roomy:w-12 xl:mx-0 xl:w-full xl:justify-start xl:rounded-2xl xl:px-3"
        }`}
      >
        <Icon name="link" className="size-5 shrink-0" />
        <span className={`min-w-0 flex-1 truncate text-left ${wide(collapsed)}`}>{t("action")}</span>
      </button>
      <InviteDialog link={link} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// A phone has no sidebar, so it sits in the bar beside the User.
export function InviteBusinessRound({ link }: { link: string }) {
  const t = useTranslations("business.invite");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="icon"
        aria-label={t("action")}
        className="size-11! bg-brand! text-ink!"
        onClick={() => setOpen(true)}
      >
        <Icon name="link" className="size-4" />
      </Button>
      <InviteDialog link={link} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
