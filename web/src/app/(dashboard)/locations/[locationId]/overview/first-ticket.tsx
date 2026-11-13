"use client";

import { useTranslations } from "next-intl";
import { Illustration } from "@/components/illustration";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocationActions } from "../location-actions";
import { SampleTicket } from "./sample-ticket";

const STEPS: [IconName, "create" | "show" | "move"][] = [
  ["tag", "create"],
  ["qrcode", "show"],
  ["check", "move"],
];

// A Location with no Tickets has nothing to overview, so it says how it starts.
// The sample is for those who can delete it (ADR 0155).
export function FirstTicket({ sample = false }: { sample?: boolean }) {
  const t = useTranslations("today.first");
  const { newTicket } = useLocationActions();
  return (
    <section className="on-pine flex flex-col rounded-sheet bg-pine p-6 text-surface lg:p-10">
      <div className="flex items-center justify-between gap-8">
        <div>
          <h2 className="text-title-h4 lg:text-title-h3">{t("title")}</h2>
          <p className="mt-2 max-w-xl text-p-lg">{t("body")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={newTicket}
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 text-label-sm text-ink transition-[background-color,scale] hover:bg-brand-hover active:scale-[0.97]"
            >
              <Icon name="add" className="size-3.5" />
              {t("action")}
            </button>
            {sample && (
              <SampleTicket className="inline-flex h-12 cursor-pointer items-center rounded-full bg-surface/10 px-5 text-label-sm transition-colors hover:bg-surface/16 aria-busy:cursor-progress aria-busy:opacity-70" />
            )}
          </div>
        </div>
        <Illustration name="progress-on-pine" className="hidden h-56 w-auto shrink-0 md:block" />
      </div>
      <ul className="mt-auto grid gap-3 pt-8 md:grid-cols-3">
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
