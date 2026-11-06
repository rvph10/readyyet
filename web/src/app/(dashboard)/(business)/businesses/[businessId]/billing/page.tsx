import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { PLAN_NAMES, PRICES } from "@/app/(dashboard)/locations/[locationId]/plan-prices";
import { intlLocale } from "@/app/(dashboard)/locations/[locationId]/tickets/ticket-views";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { getOwnedBusiness } from "@/lib/business";
import { BusinessHeader } from "../business-header";
import { getBusinessLocations } from "../business-data";
import {
  hasPaid,
  moneyOptions,
  monthlyCost,
  nextPayment,
  planMix,
  planState,
  type BusinessLocation,
} from "../business-views";
import { PlanPill } from "../plan-pill";
import { StatTile } from "../stat-tile";
import { PortalButton } from "./portal-button";

const GRID = "lg:grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] lg:gap-x-5";

// One lime stepping down towards the pine it sits on, checked as an ordered
// scale. The legend says each step in words, so colour is never alone.
const MIX_TONES = { PRO: "bg-brand", ESSENTIEL: "bg-brand/70", NONE: "bg-brand/40" };

const ACTIONS = {
  paused: { key: "choosePlan", variant: "primary" },
  trial: { key: "choosePlan", variant: "primary" },
  failed: { key: "fixPayment", variant: "danger" },
  stopping: { key: "manage", variant: "secondary" },
  changing: { key: "manage", variant: "secondary" },
  active: { key: "manage", variant: "secondary" },
} as const;

async function LocationRow({ location }: { location: BusinessLocation }) {
  const [t, tPlans, format, locale] = await Promise.all([
    getTranslations("business.billing"),
    getTranslations("plans"),
    getFormatter(),
    getLocale(),
  ]);
  const { id, name, billing, timeZone } = location;
  const state = planState(billing);
  const action = ACTIONS[state];
  const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone });
  const onDate = (date: string | null) => day.format(new Date(date!));
  const detail = {
    paused: t("pausedHint"),
    failed: t("failedHint"),
    trial: t("trialEnds", { date: onDate(billing.trialEndsAt) }),
    stopping: t("stopsOn", { date: onDate(billing.currentPeriodEnd) }),
    changing: t("renewsOn", { date: onDate(billing.currentPeriodEnd) }),
    active: t("renewsOn", { date: onDate(billing.currentPeriodEnd) }),
  }[state];
  const price = state !== "paused" && state !== "trial" && PRICES[billing.plan!][billing.interval!];
  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-3 py-3 lg:min-h-18 lg:px-4 lg:py-2 ${GRID}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={id} name={name} src={null} className="lg:size-12! lg:text-base!" />
        <span className="min-w-0">
          <span title={name} className="block truncate text-label-md">
            {name}
          </span>
          <span title={detail} className="block truncate text-p-xs text-muted">
            {detail}
          </span>
        </span>
      </div>
      <PlanPill location={location} />
      <span className="text-label-sm whitespace-nowrap tabular-nums max-lg:hidden">
        {price &&
          `${format.number(price, moneyOptions(price))}${tPlans(billing.interval === "MONTH" ? "perMonth" : "perYear")}`}
      </span>
      <Link
        href={`/locations/${id}/billing`}
        className={`${buttonClass({ variant: action.variant, size: "sm" })} max-lg:col-span-2 lg:justify-self-end`}
      >
        {t(action.key)}
      </Link>
    </li>
  );
}

// ADR 0102: every Location's plan in one place. Paying is per Location (ADR
// 0003), so changing one stays on that Location's page, and this is where
// Stripe's portal comes back to.
export default async function BusinessBillingPage({ params }: PageProps<"/businesses/[businessId]/billing">) {
  const { businessId } = await params;
  const [business, locations, t, tDashboard, format, locale, requestHeaders] = await Promise.all([
    getOwnedBusiness(businessId),
    getBusinessLocations(businessId),
    getTranslations("business"),
    getTranslations("dashboard"),
    getFormatter(),
    getLocale(),
    headers(),
  ]);
  const money = (amount: number) => format.number(amount, moneyOptions(amount));
  const next = nextPayment(locations);
  const mix = planMix(locations);
  const mixName = (key: (typeof mix)[number]["key"]) => (key === "NONE" ? t("billing.noPlan") : PLAN_NAMES[key]);
  const day = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "long",
    timeZone: next?.location.timeZone,
  });
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const referralLink = `${protocol}://${requestHeaders.get("host")}/sign-in?ref=${business.referralCode}`;

  return (
    <>
      <BusinessHeader title={tDashboard("sections.billing")} subtitle={business.name} />
      <div className="grid flex-1 grid-rows-[auto_1fr] gap-4 lg:gap-5 xl:grid-cols-12">
        <section className="on-pine flex min-h-64 flex-col rounded-sheet bg-pine p-5 text-surface lg:p-6 xl:col-span-7">
          <h2 className="text-label-sm">{t("monthlyCost")}</h2>
          <p className="mt-1 text-[2.5rem] leading-[3rem] font-bold tracking-tight tabular-nums lg:text-[3.25rem] lg:leading-[3.75rem]">
            {money(monthlyCost(locations))}
          </p>
          <p className="text-p-sm">{t("billing.listPrice")}</p>
          <div className="mt-auto pt-8">
            <ul className="flex h-10 gap-0.5" aria-label={t("billing.mix")}>
              {mix.flatMap(({ key, members }) =>
                members.map(({ id, name }) => (
                  <li key={id} title={name} className={`min-w-0 flex-1 rounded-[4px] ${MIX_TONES[key]}`}>
                    <span className="sr-only">{`${name}: ${mixName(key)}`}</span>
                  </li>
                )),
              )}
            </ul>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {mix.map(({ key, members }) => (
                <li key={key} className="flex items-center gap-2 text-p-sm">
                  <span aria-hidden="true" className={`size-3 rounded-[3px] ${MIX_TONES[key]}`} />
                  {mixName(key)}
                  <span className="font-semibold tabular-nums">{members.length}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:col-span-5 xl:grid-cols-1">
          <StatTile
            label={t("billing.nextPayment")}
            value={next ? day.format(new Date(next.date)) : t("billing.nothingDue")}
            note={next ? `${money(next.amount)}, ${next.location.name}` : t("billing.nothingDueHint")}
          />
          <Panel as="section" className="flex flex-col justify-between gap-3">
            <div>
              <h2 className="text-label-sm">{t("billing.cardsTitle")}</h2>
              <p className="mt-1 text-p-sm text-pretty text-muted">
                {t(hasPaid(locations) ? "billing.cardsHint" : "billing.cardsNone")}
              </p>
            </div>
            {hasPaid(locations) && <PortalButton businessId={businessId} />}
          </Panel>
        </div>
        <Panel as="section" padding="none" className="overflow-clip xl:col-span-8">
          <h2 className="px-5 pt-5 pb-4 text-title-h6 lg:px-7 lg:pt-6">{t("billing.locations")}</h2>
          {locations.length > 0 ? (
            <>
              <div className={`mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}>
                <span>{t("overview.location")}</span>
                <span>{t("overview.plan")}</span>
                <span>{t("billing.price")}</span>
              </div>
              <ul className="flex flex-col gap-1 p-2 lg:p-3">
                {locations.map((location) => (
                  <LocationRow key={location.id} location={location} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState illustration="box" title={t("overview.emptyTitle")} description={t("overview.emptyHint")} />
          )}
        </Panel>
        <section className="flex flex-col gap-3 self-start rounded-sheet border border-border bg-surface p-6 xl:col-span-4">
          <h2 className="text-title-h6">{t("billing.inviteTitle")}</h2>
          <p className="text-p-sm text-pretty text-muted">{t("billing.inviteHint")}</p>
          <CopyField label={t("billing.inviteLink")} value={referralLink} />
        </section>
      </div>
    </>
  );
}
