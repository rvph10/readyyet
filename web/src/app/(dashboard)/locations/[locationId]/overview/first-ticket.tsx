"use client";

import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocationActions } from "../location-actions";

const STEPS: [IconName, "create" | "show" | "move"][] = [
  ["tag", "create"],
  ["qrcode", "show"],
  ["check", "move"],
];

// A Location with no Tickets has nothing to overview, so it says how it starts.
export function FirstTicket() {
  const t = useTranslations("today.first");
  const { newTicket } = useLocationActions();
  return (
    <section className="on-pine rounded-sheet bg-pine p-6 text-surface lg:p-10">
      <h2 className="text-title-h4 lg:text-title-h3">{t("title")}</h2>
      <p className="mt-2 max-w-xl text-p-lg">{t("body")}</p>
      <button
        type="button"
        onClick={newTicket}
        className="mt-7 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 text-label-sm text-ink transition-[background-color,scale] hover:bg-brand-hover active:scale-[0.97]"
      >
        <Icon name="add" className="size-3.5" />
        {t("action")}
      </button>
      <ul className="mt-10 grid gap-3 md:grid-cols-3">
        {STEPS.map(([icon, step]) => (
          <li key={step} className="rounded-card bg-surface/8 p-5">
            <Icon name={icon} className="size-5 text-brand" />
            <p className="mt-3 text-label-md">{t(`${step}.title`)}</p>
            <p className="mt-0.5 text-p-sm">{t(`${step}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
