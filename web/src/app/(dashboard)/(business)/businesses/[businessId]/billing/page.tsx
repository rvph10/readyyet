import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PRICES } from "@/app/(dashboard)/locations/[locationId]/plan-prices";
import { intlLocale } from "@/app/(dashboard)/locations/[locationId]/tickets/ticket-views";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { SortHeader } from "@/components/ui/sort-header";
import { parseSort, setSort, type Sort } from "@/lib/sort";
import { BusinessHeader } from "../business-header";
import { getBusinessLocations } from "../business-data";
import { hasPaid, moneyOptions, nextPayment, planState, type BusinessLocation } from "../business-views";
import { PlanPill } from "../plan-pill";
import { StatTile } from "../stat-tile";
import { PortalButton } from "./portal-button";

const GRID = "lg:grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] lg:gap-x-5";
const SORTS = ["location", "plan", "price"] as const;
const BY_NAME: Sort<(typeof SORTS)[number]> = { column: "location", dir: "asc" };

// Nothing to pay yet while a Location is on trial or paused.
function priceOf({ billing }: BusinessLocation) {
  const state = planState(billing);
  return state === "paused" || state === "trial" ? null : PRICES[billing.plan!][billing.interval!];
}

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
  const price = priceOf(location);
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
export default async function BusinessBillingPage({
  params,
  searchParams,
}: PageProps<"/businesses/[businessId]/billing">) {
  const [{ businessId }, search] = await Promise.all([params, searchParams]);
  const [unsorted, t, tDashboard, format, locale] = await Promise.all([
    getBusinessLocations(businessId),
    getTranslations("business"),
    getTranslations("dashboard"),
    getFormatter(),
    getLocale(),
  ]);
  const money = (amount: number) => format.number(amount, moneyOptions(amount));
  const next = nextPayment(unsorted);
  const sort = parseSort(search, SORTS) ?? BY_NAME;
  const collator = new Intl.Collator(intlLocale(locale));
  const compare = {
    location: (a: BusinessLocation, b: BusinessLocation) => collator.compare(a.name, b.name),
    plan: (a: BusinessLocation, b: BusinessLocation) => collator.compare(a.billing.plan ?? "", b.billing.plan ?? ""),
    price: (a: BusinessLocation, b: BusinessLocation) => (priceOf(a) ?? 0) - (priceOf(b) ?? 0),
  }[sort.column];
  const locations = [...unsorted].sort((a, b) => compare(a, b) * (sort.dir === "asc" ? 1 : -1));
  const sortHref = (order: Sort<(typeof SORTS)[number]>) => {
    const query = new URLSearchParams();
    setSort(query, order);
    return `/businesses/${businessId}/billing?${query}`;
  };
  const day = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "long",
    timeZone: next?.location.timeZone,
  });

  return (
    <>
      <BusinessHeader title={tDashboard("sections.billing")} />
      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <Panel as="section" padding="none" className="overflow-clip xl:col-span-8">
          {locations.length > 0 ? (
            <>
              <div
                className={`mx-3 mt-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}
              >
                <span>
                  <SortHeader sort={sort} href={sortHref} column="location" label={t("overview.location")} />
                </span>
                <span>
                  <SortHeader sort={sort} href={sortHref} column="plan" label={t("overview.plan")} />
                </span>
                <span>
                  <SortHeader sort={sort} href={sortHref} column="price" label={t("billing.price")} first="desc" />
                </span>
              </div>
              <ul className="flex flex-col gap-1 p-2 lg:p-3">
                {locations.map((location) => (
                  <LocationRow key={location.id} location={location} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState illustration="box" title={t("home.emptyTitle")} description={t("home.emptyHint")} />
          )}
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:col-span-4 xl:grid-cols-1">
          <StatTile
            label={t("billing.nextPayment")}
            value={next ? day.format(new Date(next.date)) : t("billing.nothingDue")}
            note={next ? `${money(next.amount)}, ${next.location.name}` : t("billing.nothingDueHint")}
          />
          {hasPaid(locations) && (
            <Panel as="section">
              <PortalButton businessId={businessId} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
