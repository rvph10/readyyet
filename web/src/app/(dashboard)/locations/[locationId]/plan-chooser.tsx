"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import { startCheckout } from "./actions";

type Plan = "PRO" | "ESSENTIEL";
type Interval = "MONTH" | "YEAR";

// ADR 0031, excluding VAT.
const PRICES: Record<Plan, Record<Interval, number>> = {
  PRO: { MONTH: 49, YEAR: 490 },
  ESSENTIEL: { MONTH: 29, YEAR: 290 },
};

// The trial's one job: get a plan chosen, in as few steps as possible. Pro is
// preselected (ADR 0031), and the card is charged when the trial ends (ADR 0033).
export function PlanChooser({ locationId, trialDaysLeft }: { locationId: string; trialDaysLeft: number | null }) {
  const t = useTranslations("plans");
  const [plan, setPlan] = useState<Plan>("PRO");
  const [interval, setInterval] = useState<Interval>("MONTH");
  const [failure, setFailure] = useState<"tooManyMembers" | "unexpected" | null>(null);
  const [pending, startTransition] = useTransition();

  function checkout() {
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(startCheckout(locationId, { plan, interval }));
      if (!result.ok) setFailure(result.code === "MEMBER_LIMIT_REACHED" ? "tooManyMembers" : "unexpected");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-p-sm text-muted">{trialDaysLeft ? t("chargedLater", { days: trialDaysLeft }) : t("resume")}</p>
      {failure && <FormAlert>{t(`errors.${failure}`)}</FormAlert>}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1" role="group" aria-label={t("billedEvery")}>
        {(["MONTH", "YEAR"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={interval === option}
            onClick={() => setInterval(option)}
            className={`min-h-11 cursor-pointer rounded-lg px-2 text-label-xs font-semibold transition-colors ${
              interval === option ? "bg-pine text-surface" : "text-muted hover:text-ink"
            }`}
          >
            {t(option === "MONTH" ? "monthly" : "yearly")}
            {option === "YEAR" && (
              <span className={interval === option ? "text-brand" : undefined}> {t("twoMonthsFree")}</span>
            )}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={t("title")} className="flex flex-col gap-2">
        {(["PRO", "ESSENTIEL"] as const).map((option) => {
          const current = plan === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={current}
              onClick={() => setPlan(option)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-card border-2 p-4 text-left transition-colors ${
                current ? "border-pine bg-pine-subtle" : "border-border hover:bg-subtle"
              }`}
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                  current ? "bg-pine text-brand" : "border-2 border-border-strong"
                }`}
              >
                {current && <Icon name="check" className="size-2.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-label-md">{option === "PRO" ? "Pro" : "Essentiel"}</span>
                  <span className="text-label-md">
                    €{PRICES[option][interval]}
                    <span className="text-p-xs text-muted">{t(interval === "MONTH" ? "perMonth" : "perYear")}</span>
                  </span>
                </span>
                <span className="mt-0.5 block text-p-sm text-muted">{t(option === "PRO" ? "pro" : "essentiel")}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Button size="lg" pending={pending} pendingLabel={t("opening")} onClick={checkout}>
        {t("toPayment")}
        <Icon name="arrow-right" className="size-2.5" />
      </Button>
      <p className="text-p-xs text-muted">{t("perLocation")}</p>
    </div>
  );
}
