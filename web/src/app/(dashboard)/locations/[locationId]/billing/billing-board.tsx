"use client";

import { ErrorCode } from "@readyyet/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { startCheckout } from "../actions";
import {
  PLAN_FEATURES,
  PLAN_NAMES,
  PRICES,
  REFERRAL_DISCOUNTS,
  startsAtOnce,
  type Interval,
  type Plan,
  chargedAtTrialEnd,
} from "../plan-prices";
import { isUrgentTrial, TrialMeter } from "../trial-meter";
import { applyPromotionCode, changePlan, openPortal, previewPromotionCode, stopPaying } from "./actions";

interface Props {
  locationId: string;
  businessId: string;
  owner: boolean;
  billing: components["schemas"]["BillingDto"];
  // As on the sidebar: the trial's days, 0 once frozen, null when paid.
  daysLeft: number | null;
  trialEnd: string | null;
  periodEnd: string | null;
}

const PLANS = ["PRO", "ESSENTIEL"] as const;

function useMoney() {
  const format = useFormatter();
  return (amount: number, cents = false) =>
    format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: cents ? 2 : 0 });
}

function usePlanPrice() {
  const t = useTranslations("plans");
  const money = useMoney();
  return (plan: Plan, interval: Interval) =>
    `${money(PRICES[plan][interval])}${t(interval === "MONTH" ? "perMonth" : "perYear")}`;
}

function TileTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-title-h6">{children}</h2>;
}

// ADR 0091: what the Location's billing is right now, one state at a time, with
// the one thing to do about it. Everything else on the page supports this tile.
function Hero(props: Props & { checkout: (plan: Plan, interval: Interval) => void; pending: boolean }) {
  const { billing, daysLeft, trialEnd, periodEnd, owner, locationId, businessId, checkout, pending } = props;
  const t = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const planPrice = usePlanPrice();
  const toast = useToast();
  const [undoing, startUndo] = useTransition();
  const [opening, startOpening] = useTransition();

  const pastDue = billing.status === "PAST_DUE";
  const inTrial = daysLeft !== null && daysLeft > 0;
  const paused = daysLeft === 0;
  const urgent = pastDue || paused || (inTrial && isUrgentTrial(daysLeft));
  const plan = billing.plan && PLAN_NAMES[billing.plan];
  const waiting = billing.scheduledPlan && billing.scheduledInterval;

  function keepPlan() {
    startUndo(async () => {
      const result = await orFailure(changePlan(locationId, billing.plan!, billing.interval!));
      toast(result.ok ? { message: t("kept", { plan: plan! }) } : { tone: "error", message: t("errors.unexpected") });
    });
  }

  function updateCard() {
    startOpening(async () => {
      const result = await orFailure(openPortal(businessId));
      if (!result.ok) toast({ tone: "error", message: t("errors.portal") });
    });
  }

  let title: string;
  let body: string;
  if (inTrial) {
    title = tPlans("daysLeft", { days: daysLeft });
    body = t(chargedAtTrialEnd(daysLeft) ? "trialBody" : "trialBodyNow", { date: trialEnd! });
  } else if (paused) {
    title = t("pausedTitle");
    body = t("pausedBody");
  } else if (pastDue) {
    title = t("pastDueTitle");
    body = t(owner ? "pastDueBody" : "pastDueBodyAdmin");
  } else if (billing.cancelAtPeriodEnd) {
    title = t("stoppingTitle", { plan: plan!, date: periodEnd! });
    body = t("stoppingBody");
  } else if (waiting) {
    title = plan!;
    body = t("waitingBody", {
      plan: PLAN_NAMES[billing.scheduledPlan!],
      price: planPrice(billing.scheduledPlan!, billing.scheduledInterval!),
      date: periodEnd!,
    });
  } else {
    title = plan!;
    body = t("activeBody", { price: planPrice(billing.plan!, billing.interval!) });
  }

  return (
    <section
      aria-labelledby="billing-state"
      className={`on-pine flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-sheet p-5 text-surface md:col-span-2 lg:p-6 xl:col-span-4 ${
        urgent ? "bg-danger" : "bg-pine"
      }`}
    >
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-4">
        <div>
          <p className="text-label-sm">{t("yourPlan")}</p>
          <h2 id="billing-state" className="mt-1 text-title-h5">
            {title}
          </h2>
          {inTrial && <TrialMeter daysLeft={daysLeft} className="mt-4 h-2.5 max-w-xl" />}
          <p className="mt-1 max-w-xl text-p-sm">{body}</p>
        </div>
        {inTrial && (
          <HeroButton urgent={urgent} busy={pending} onClick={() => checkout("PRO", "MONTH")}>
            {tPlans("keepPro")}
          </HeroButton>
        )}
        {paused && (
          <HeroButton urgent={urgent} busy={pending} onClick={() => checkout("PRO", "MONTH")}>
            {t("startPro")}
          </HeroButton>
        )}
        {!inTrial && !paused && !pastDue && (billing.cancelAtPeriodEnd || waiting) && (
          <HeroButton urgent={urgent} busy={undoing} onClick={keepPlan}>
            {t("keep", { plan: plan! })}
          </HeroButton>
        )}
        {pastDue && owner && (
          <HeroButton urgent={urgent} busy={opening} onClick={updateCard}>
            {t("updateCard")}
          </HeroButton>
        )}
      </div>
      <PaymentSummary {...props} />
    </section>
  );
}

function HeroButton(props: { urgent: boolean; busy: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={props.busy}
      aria-busy={props.busy || undefined}
      onClick={props.onClick}
      className={`flex h-12 w-fit cursor-pointer items-center gap-2 rounded-full px-6 text-label-sm font-bold text-ink transition-[background-color,scale] active:scale-[0.97] aria-busy:cursor-progress aria-busy:opacity-70 ${
        props.urgent ? "bg-surface hover:bg-subtle" : "bg-brand hover:bg-brand-hover"
      }`}
    >
      {props.children}
      <Icon name="arrow-right" className="size-2.5" />
    </button>
  );
}

// In the plan's own strip, as one thing to read rather than a tile beside it.
function PaymentSummary({ billing, periodEnd, owner, businessId }: Props) {
  const t = useTranslations("billing");
  const planPrice = usePlanPrice();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const paying = billing.status === "ACTIVE" || billing.status === "PAST_DUE";
  const pastDue = billing.status === "PAST_DUE";
  // A failed payment is Stripe's to retry, on no date we know.
  const next = billing.status === "ACTIVE" && !billing.cancelAtPeriodEnd;
  const price =
    billing.scheduledPlan && billing.scheduledInterval
      ? planPrice(billing.scheduledPlan, billing.scheduledInterval)
      : billing.plan && billing.interval && planPrice(billing.plan, billing.interval);

  function open() {
    setFailed(false);
    startTransition(async () => {
      const result = await orFailure(openPortal(businessId));
      if (!result.ok) setFailed(true);
    });
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 sm:items-end sm:text-right">
      <div>
        <p className="text-label-sm">{t("nextPayment")}</p>
        <p className="mt-1 text-title-h6">{next ? periodEnd : t(pastDue ? "pastDueShort" : "nothingDue")}</p>
        <p className="text-p-sm">{next ? price : t(pastDue ? "retrying" : paying ? "noMorePayments" : "noCardYet")}</p>
      </div>
      {paying && failed && <FormAlert>{t("errors.portal")}</FormAlert>}
      {paying &&
        (owner ? (
          <Button variant="secondary" size="sm" pending={pending} pendingLabel={t("opening")} onClick={open}>
            {t("cardsAndInvoices")}
          </Button>
        ) : (
          <p className="mt-auto text-p-xs text-muted">{t("ownerOnlyInvoices")}</p>
        ))}
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  highlighted,
  badge,
  action,
}: {
  plan: Plan;
  interval: Interval;
  highlighted: boolean;
  badge: string | null;
  action: ReactNode;
}) {
  const t = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const money = useMoney();
  return (
    <article
      className={`flex flex-col gap-5 rounded-card border-2 p-5 ${highlighted ? "border-pine bg-pine-subtle" : "border-border"}`}
    >
      <div>
        <div className="flex min-h-7 items-center justify-between gap-2">
          <h3 className="text-title-h6">{PLAN_NAMES[plan]}</h3>
          {badge && <span className="rounded-full bg-brand px-3 py-1 text-label-xs font-bold text-ink">{badge}</span>}
        </div>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-title-h3">{money(PRICES[plan][interval])}</span>
          <span className="text-p-sm text-muted">{tPlans(interval === "MONTH" ? "perMonth" : "perYear")}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {PLAN_FEATURES[plan].map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-p-sm">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pine text-brand">
              <Icon name="check" className="size-2.5" />
            </span>
            {t(`features.${feature}`)}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{action}</div>
    </article>
  );
}

function PlansTile({
  billing,
  periodEnd,
  locationId,
  checkout,
  pending,
}: Props & { checkout: (plan: Plan, interval: Interval) => void; pending: boolean }) {
  const t = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const planPrice = usePlanPrice();
  const toast = useToast();
  const [interval, setInterval] = useState<Interval>(billing.interval ?? "MONTH");
  const [move, setMove] = useState<{ plan: Plan; interval: Interval } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();

  const paying = billing.status === "ACTIVE" || billing.status === "PAST_DUE";
  const current = paying ? { plan: billing.plan!, interval: billing.interval! } : null;
  const atOnce = current && move && startsAtOnce(current, move);

  const sameTier = current?.plan === move?.plan;
  const moveTitle = !move
    ? ""
    : sameTier
      ? t(move.interval === "YEAR" ? "payYearlyTitle" : "payMonthlyTitle")
      : t("moveTitle", { plan: PLAN_NAMES[move.plan] });

  function confirm() {
    setFailure(null);
    startMoving(async () => {
      const result = await orFailure(changePlan(locationId, move!.plan, move!.interval));
      if (result.ok) {
        toast({ message: t(atOnce ? "movedNow" : "moveWaiting", { plan: PLAN_NAMES[move!.plan] }) });
        setMove(null);
        return;
      }
      setFailure(moveFailure(result));
    });
  }

  function moveFailure({ code }: ActionFailure) {
    if (code === ErrorCode.MEMBER_LIMIT_REACHED) return tPlans("errors.tooManyMembers");
    return t(code === ErrorCode.CONFLICT ? "errors.cardDeclined" : "errors.unexpected");
  }

  function cardFor(plan: Plan) {
    const isCurrent = current?.plan === plan && current.interval === interval;
    const isWaiting = billing.scheduledPlan === plan && billing.scheduledInterval === interval;
    const badge = isCurrent
      ? t("currentPlan")
      : isWaiting
        ? t("fromDate", { date: periodEnd! })
        : !current && plan === "PRO"
          ? t("recommended")
          : null;
    let action: ReactNode = null;
    if (!current) {
      action = (
        <Button
          size="lg"
          variant={plan === "PRO" ? "primary" : "secondary"}
          pending={pending}
          pendingLabel={tPlans("opening")}
          onClick={() => checkout(plan, interval)}
        >
          {t("choose", { plan: PLAN_NAMES[plan] })}
        </Button>
      );
    } else if (!isCurrent && !isWaiting) {
      action = (
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            setFailure(null);
            setMove({ plan, interval });
          }}
        >
          {current.plan === plan
            ? t(interval === "YEAR" ? "payYearly" : "payMonthly")
            : t("moveTo", { plan: PLAN_NAMES[plan] })}
        </Button>
      );
    }
    return (
      <PlanCard
        key={plan}
        plan={plan}
        interval={interval}
        highlighted={isCurrent || (!current && plan === "PRO")}
        badge={badge}
        action={action}
      />
    );
  }

  return (
    <Panel as="section" padding="lg" className="flex flex-col gap-5 md:col-span-2 xl:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TileTitle>{t("plansTitle")}</TileTitle>
        <div className="flex gap-1 rounded-full bg-subtle p-1" role="group" aria-label={tPlans("billedEvery")}>
          {(["MONTH", "YEAR"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={interval === option}
              onClick={() => setInterval(option)}
              className={`min-h-10 cursor-pointer rounded-full px-4 text-label-xs font-semibold transition-colors ${
                interval === option ? "bg-pine text-surface" : "text-muted hover:text-ink"
              }`}
            >
              {tPlans(option === "MONTH" ? "monthly" : "yearly")}
              {option === "YEAR" && (
                <span className={interval === option ? "text-brand" : undefined}> {tPlans("twoMonthsFree")}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{PLANS.map(cardFor)}</div>
      <p className="text-p-sm text-muted">{t("bothPlans")}</p>

      <Dialog open={move !== null} onClose={() => setMove(null)} title={moveTitle}>
        {move && current && (
          <div className="flex flex-col gap-4">
            {failure && <FormAlert>{failure}</FormAlert>}
            <p className="text-p-md">
              {atOnce
                ? t("moveNowBody", { price: planPrice(move.plan, move.interval) })
                : sameTier
                  ? t("intervalLaterBody", { date: periodEnd!, price: planPrice(move.plan, move.interval) })
                  : t("moveLaterBody", {
                      plan: PLAN_NAMES[current.plan],
                      date: periodEnd!,
                      price: planPrice(move.plan, move.interval),
                    })}
            </p>
            {move.plan === "ESSENTIEL" && current.plan === "PRO" && <p className="text-p-md">{t("essentielLoses")}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setMove(null)}>
                {t("notNow")}
              </Button>
              <Button pending={moving} pendingLabel={t("saving")} onClick={confirm}>
                {t("confirmMove")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Panel>
  );
}

function CodeTile({
  billing,
  locationId,
  code,
  setCode,
  error,
  setError,
}: Props & {
  code: string;
  setCode: (code: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  const t = useTranslations("billing");
  const money = useMoney();
  const toast = useToast();
  const [preview, setPreview] = useState<{ now: number; withCode: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const paying = billing.status === "ACTIVE" || billing.status === "PAST_DUE";
  // Few have one, so it waits behind a link. A referred Business has a discount
  // to see, which stays out in the open.
  const [showing, setShowing] = useState(!paying && billing.referralDiscount);

  function failed({ code: failure }: ActionFailure) {
    setError(t(failure === ErrorCode.VALIDATION_ERROR ? "errors.badCode" : "errors.unexpected"));
  }

  function check() {
    setError(null);
    startTransition(async () => {
      const result = await orFailure(previewPromotionCode(locationId, code.trim()));
      if (result.ok) setPreview({ now: result.now, withCode: result.withCode });
      else failed(result);
    });
  }

  function apply() {
    startTransition(async () => {
      const result = await orFailure(applyPromotionCode(locationId, code.trim()));
      if (!result.ok) {
        failed(result);
        return;
      }
      toast({ message: t("codeApplied") });
      setCode("");
      setPreview(null);
    });
  }

  if (!showing) {
    return (
      <Button variant="link" onClick={() => setShowing(true)}>
        {t("haveCode")}
      </Button>
    );
  }

  return (
    <Panel as="section" padding="lg" className="flex w-full max-w-md flex-col gap-3">
      <TileTitle>{t("codeTitle")}</TileTitle>
      {!paying && billing.referralDiscount && (
        <p className="rounded-xl bg-brand px-3.5 py-3 text-p-sm text-ink">
          {t("referral", {
            pro: money(REFERRAL_DISCOUNTS.PRO, true),
            essentiel: money(REFERRAL_DISCOUNTS.ESSENTIEL, true),
          })}
        </p>
      )}
      <Field
        label={t("codeLabel")}
        hideLabel
        placeholder={t("codeLabel")}
        value={code}
        maxLength={64}
        autoComplete="off"
        error={error}
        onChange={(event) => {
          setCode(event.target.value);
          setPreview(null);
          setError(null);
        }}
      />
      {!paying && <p className="text-p-sm text-muted">{t("codeAtCheckout")}</p>}
      {paying && !preview && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!code.trim()}
          pending={pending}
          pendingLabel={t("checking")}
          onClick={check}
        >
          {t("checkCode")}
        </Button>
      )}
      {preview && (
        <>
          <p className="text-p-sm">
            {t("codePreview", { now: money(preview.now / 100, true), withCode: money(preview.withCode / 100, true) })}
          </p>
          <Button size="sm" className="w-full" pending={pending} pendingLabel={t("saving")} onClick={apply}>
            {t("applyCode")}
          </Button>
        </>
      )}
    </Panel>
  );
}

function StopTile({ locationId, periodEnd }: Props) {
  const t = useTranslations("billing");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setFailed(false);
    startTransition(async () => {
      const result = await orFailure(stopPaying(locationId));
      if (!result.ok) {
        setFailed(true);
        return;
      }
      toast({ message: t("stopped", { date: periodEnd! }) });
      setOpen(false);
    });
  }

  return (
    // A quiet link, always there, and one step from done: easy to find when
    // wanted, without a tile suggesting it to everyone (ADR 0106).
    <div>
      <Button variant="link" onClick={() => setOpen(true)}>
        {t("stopAction")}
      </Button>
      <Dialog variant="destructive" open={open} onClose={() => setOpen(false)} title={t("stopConfirmTitle")}>
        <div className="flex flex-col gap-4">
          {failed && <FormAlert>{t("errors.unexpected")}</FormAlert>}
          <p className="text-p-md">{t("stopConfirmBody", { date: periodEnd! })}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("notNow")}
            </Button>
            <Button variant="danger" pending={pending} pendingLabel={t("saving")} onClick={confirm}>
              {t("stopAction")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function BillingBoard(props: Props) {
  const { billing, owner, locationId } = props;
  const t = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const toast = useToast();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canStop = owner && (billing.status === "ACTIVE" || billing.status === "PAST_DUE") && !billing.cancelAtPeriodEnd;

  function checkout(plan: Plan, interval: Interval) {
    setCodeError(null);
    startTransition(async () => {
      const promotionCode = code.trim() || undefined;
      const result = await orFailure(startCheckout(locationId, { plan, interval, promotionCode }));
      if (result.ok) return;
      if (result.fields?.promotionCode) {
        setCodeError(t("errors.badCode"));
      } else if (result.code === ErrorCode.MEMBER_LIMIT_REACHED) {
        toast({ tone: "error", message: tPlans("errors.tooManyMembers") });
      } else if (result.code === ErrorCode.CONFLICT) {
        toast({ tone: "error", message: t("errors.alreadyPaying") });
      } else {
        toast({ tone: "error", message: tPlans("errors.unexpected") });
      }
    });
  }

  return (
    <div className="grid content-start gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
      <Hero {...props} checkout={checkout} pending={pending} />
      <PlansTile {...props} checkout={checkout} pending={pending} />
      <div className="flex flex-wrap items-start justify-between gap-4 md:col-span-2 xl:col-span-4">
        <CodeTile {...props} code={code} setCode={setCode} error={codeError} setError={setCodeError} />
        {canStop && <StopTile {...props} />}
      </div>
    </div>
  );
}
