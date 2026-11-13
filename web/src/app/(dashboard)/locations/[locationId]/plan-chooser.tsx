"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import { startCheckout } from "./actions";
import {
  chargedAtTrialEnd,
  perMonth,
  PLAN_FEATURES,
  PLAN_NAMES,
  PRICES,
  type Interval,
  type Plan,
} from "./plan-prices";

function Feature({ children, check }: { children: ReactNode; check: string }) {
  return (
    <li className="flex items-start gap-2.5 text-p-sm">
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${check}`}>
        <Icon name="check" className="size-2.5" />
      </span>
      {children}
    </li>
  );
}

// Monthly or yearly, the yearly side saying what it saves. Also in the drawer
// that adds a shop (add-shop.tsx).
export function IntervalToggle({
  interval,
  onChange,
  className = "",
}: {
  interval: Interval;
  onChange: (interval: Interval) => void;
  className?: string;
}) {
  const t = useTranslations("plans");
  return (
    <div
      role="group"
      aria-label={t("billedEvery")}
      className={`inline-flex w-full rounded-full bg-subtle p-1 sm:w-auto ${className}`}
    >
      {(["MONTH", "YEAR"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={interval === option}
          onClick={() => onChange(option)}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-label-sm whitespace-nowrap transition-colors sm:flex-none sm:px-5 ${
            option === "YEAR" ? "flex-1" : "flex-none"
          } ${interval === option ? "bg-pine text-surface" : "text-muted hover:text-ink"}`}
        >
          {t(option === "MONTH" ? "monthly" : "yearly")}
          {option === "YEAR" && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-label-xs font-bold text-ink">
              {t("twoMonthsFree")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// What choosing today means, for a trial with days left: paying nothing yet is the
// thing most likely to hold someone back, so it's drawn rather than footnoted.
function ChargeTimeline({ days, price }: { days: number; price: string }) {
  const t = useTranslations("plans");
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface/10 p-4">
      <div>
        <p className="text-p-xs">{t("timelineToday")}</p>
        <p className="text-label-md text-brand">{t("timelineFree")}</p>
      </div>
      <span aria-hidden="true" className="h-1 flex-1 rounded-full bg-surface/25" />
      <div className="text-right">
        <p className="text-p-xs">{t("timelineThen", { days })}</p>
        <p className="text-label-md">{price}</p>
      </div>
    </div>
  );
}

// ADR 0115: the trial's one job is getting a plan chosen, so each plan has its own
// button and one tap leads to payment. Pro is what they've been using (ADR 0031),
// so it's the whole page's one loud thing, and the card is charged when the trial
// ends (ADR 0033). Nothing here is invented to hurry anyone: no fake countdown, and
// no claim about other shops.
export function PlanChooser({ locationId, trialDaysLeft }: { locationId: string; trialDaysLeft: number | null }) {
  const t = useTranslations("plans");
  const tBilling = useTranslations("billing");
  const format = useFormatter();
  const [interval, setInterval] = useState<Interval>("MONTH");
  const [chosen, setChosen] = useState<Plan | null>(null);
  const [failure, setFailure] = useState<"tooManyMembers" | "unexpected" | null>(null);
  const [pending, startTransition] = useTransition();
  const yearly = interval === "YEAR";
  const onTrial = Boolean(trialDaysLeft);
  const paysLater = trialDaysLeft ? chargedAtTrialEnd(trialDaysLeft) : false;
  const euros = (amount: number, digits = 0) =>
    format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: digits });
  const shown = (plan: Plan) => euros(perMonth(plan, interval), Number.isInteger(perMonth(plan, interval)) ? 0 : 2);
  const saved = (plan: Plan) => euros(PRICES[plan].MONTH * 12 - PRICES[plan].YEAR);

  function checkout(plan: Plan) {
    setChosen(plan);
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(startCheckout(locationId, { plan, interval }));
      if (!result.ok) setFailure(result.code === "MEMBER_LIMIT_REACHED" ? "tooManyMembers" : "unexpected");
    });
  }

  return (
    <>
      <p className="mt-1 max-w-xl text-p-md text-pretty text-muted">
        {trialDaysLeft ? (paysLater ? t("chargedLater", { days: trialDaysLeft }) : t("chargedNow")) : t("resume")}
      </p>

      <IntervalToggle interval={interval} onChange={setInterval} className="mt-5" />
      {/* The terms keep a yearly plan unrefunded, which the Data Act allows only
          if it is said before paying. Also in billing-board.tsx and add-shop.tsx. */}
      {yearly && <p className="mt-3 text-p-sm">{tBilling("yearlyNoRefund")}</p>}

      {failure && (
        <div className="mt-4">
          <FormAlert>{t(`errors.${failure}`)}</FormAlert>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:gap-4">
        <section
          aria-label={PLAN_NAMES.PRO}
          className="on-pine flex flex-col rounded-sheet bg-pine p-6 text-surface md:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-title-h5">{PLAN_NAMES.PRO}</h3>
            {onTrial && (
              <span className="rounded-full bg-brand px-3 py-1 text-label-xs font-bold text-ink">{t("onTrial")}</span>
            )}
          </div>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-[4.5rem] leading-none font-bold tracking-tight text-brand tabular-nums md:text-[6rem]">
              {shown("PRO")}
            </span>
            <span className="text-label-md">{t("perMonth")}</span>
          </p>
          <p className="mt-2 min-h-6 text-p-sm">
            {yearly ? t("billedYearly", { amount: euros(PRICES.PRO.YEAR), saved: saved("PRO") }) : t("billedMonthly")}
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {PLAN_FEATURES.PRO.map((feature) => (
              <Feature key={feature} check="bg-brand text-ink">
                {tBilling(`features.${feature}`)}
              </Feature>
            ))}
          </ul>
          {trialDaysLeft && paysLater ? (
            <ChargeTimeline days={trialDaysLeft} price={euros(PRICES.PRO[interval])} />
          ) : null}
          <Button
            variant="brand"
            size="lg"
            className="mt-6 h-14! text-label-md!"
            disabled={pending && chosen !== "PRO"}
            pending={pending && chosen === "PRO"}
            pendingLabel={t("opening")}
            onClick={() => checkout("PRO")}
          >
            {t(onTrial ? "keepPlan" : "startPlan", { plan: PLAN_NAMES.PRO })}
            <Icon name="arrow-right" className="size-2.5" />
          </Button>
        </section>

        <section aria-label={PLAN_NAMES.ESSENTIEL} className="flex flex-col rounded-sheet border-2 border-border p-6">
          <h3 className="text-title-h6">{PLAN_NAMES.ESSENTIEL}</h3>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="text-title-h3 tabular-nums">{shown("ESSENTIEL")}</span>
            <span className="text-label-sm text-muted">{t("perMonth")}</span>
          </p>
          <p className="mt-1 min-h-6 text-p-sm text-muted">
            {yearly
              ? t("billedYearly", { amount: euros(PRICES.ESSENTIEL.YEAR), saved: saved("ESSENTIEL") })
              : t("billedMonthly")}
          </p>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {PLAN_FEATURES.ESSENTIEL.map((feature) => (
              <Feature key={feature} check="bg-subtle text-ink">
                {tBilling(`features.${feature}`)}
              </Feature>
            ))}
            <li className="pl-7.5 text-p-sm text-muted">{t("noReviews")}</li>
          </ul>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6"
            disabled={pending && chosen !== "ESSENTIEL"}
            pending={pending && chosen === "ESSENTIEL"}
            pendingLabel={t("opening")}
            onClick={() => checkout("ESSENTIEL")}
          >
            {t("startPlan", { plan: PLAN_NAMES.ESSENTIEL })}
          </Button>
        </section>
      </div>

      <p className="mt-4 text-p-xs text-muted">{t("perLocation")}</p>
    </>
  );
}
