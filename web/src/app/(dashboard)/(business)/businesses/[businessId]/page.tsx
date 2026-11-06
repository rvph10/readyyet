import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { getOwnedBusiness } from "@/lib/business";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { WeekChart } from "../../../locations/[locationId]/overview/week-chart";
import { BusinessHeader } from "./business-header";
import { getBusinessLocations } from "./business-data";
import {
  attentionHref,
  attentionItems,
  busiest,
  moneyOptions,
  monthlyCost,
  payingCount,
  sumCounts,
  weekTotals,
  type Attention,
  type BusinessLocation,
} from "./business-views";
import { PlanPill } from "./plan-pill";
import { StatTile } from "./stat-tile";

const GRID = "lg:grid-cols-[minmax(0,1fr)_10rem_4.5rem_4.5rem_4.5rem_1rem] lg:gap-x-3";
const BAND = "mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs whitespace-nowrap text-muted lg:grid";

function Figure({ value, tone }: { value: number | undefined; tone?: string }) {
  return (
    <span className={`hidden text-right text-label-md tabular-nums lg:block ${value ? (tone ?? "") : "text-muted"}`}>
      {value ?? ""}
    </span>
  );
}

async function LocationRow({ location }: { location: BusinessLocation }) {
  const t = await getTranslations("business.overview");
  const { id, name, counts } = location;
  return (
    <li
      className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 transition-colors hover:bg-subtle has-focus-visible:bg-subtle lg:min-h-18 lg:px-4 lg:py-2 ${GRID}`}
    >
      <Link
        href={`/locations/${id}`}
        aria-label={name}
        className="absolute inset-0 rounded-2xl outline-ink -outline-offset-2 focus-visible:outline-2"
      />
      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={id} name={name} src={null} className="lg:size-12! lg:text-base!" />
        <span className="min-w-0">
          <span title={name} className="block truncate text-label-md">
            {name}
          </span>
          <span className="block truncate text-p-xs text-muted lg:hidden">
            {counts ? t("summary", { open: counts.open, ready: counts.ready, late: counts.late }) : t("unavailable")}
          </span>
        </span>
      </div>
      <PlanPill location={location} />
      <Figure value={counts?.open} />
      <Figure value={counts?.ready} tone="text-brand-text" />
      <Figure value={counts?.late} tone="text-danger" />
      <Icon name="arrow-right" className="hidden size-3 text-muted lg:block" />
    </li>
  );
}

async function AttentionRow({ item }: { item: Attention }) {
  const t = await getTranslations("business.attention");
  const urgent = item.kind === "paused" || item.kind === "failed";
  const tone = urgent
    ? "bg-danger text-surface"
    : item.kind === "late"
      ? "bg-danger-subtle text-danger"
      : "bg-brand text-ink";
  return (
    <li>
      <Link
        href={attentionHref(item)}
        className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-subtle"
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
          <Icon name={urgent ? "info-triangle" : item.kind === "feedback" ? "comment" : "time"} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label-sm">
            {"count" in item ? t(item.kind, { count: item.count }) : t(item.kind)}
          </span>
          <span className="block truncate text-p-xs text-muted">{item.location.name}</span>
        </span>
        <Icon name="arrow-right" className="size-3 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

// ADR 0102: how the whole Business is doing, and which shop to open first.
export default async function BusinessPage({ params }: PageProps<"/businesses/[businessId]">) {
  const { businessId } = await params;
  const [business, locations, me, t, tDashboard, tToday, format] = await Promise.all([
    getOwnedBusiness(businessId),
    getBusinessLocations(businessId),
    getMe(),
    getTranslations("business"),
    getTranslations("dashboard"),
    getTranslations("today"),
    getFormatter(),
  ]);
  const count = (key: "open" | "ready" | "late") => sumCounts(locations, key);
  const shown = (value: number | null) => value ?? t("overview.noNumber");
  const where = (key: "open" | "ready" | "late", none: "noneOpen" | "noneReady" | "noneLate") => {
    const location = busiest(locations, key);
    return location ? t("overview.mostAt", { location }) : t(`overview.${none}`);
  };
  const week = weekTotals(locations);
  const attention = attentionItems(locations);
  const cost = monthlyCost(locations);
  const addLocation = (
    <Link href={`/businesses/${businessId}/locations/new`} className={buttonClass()}>
      <Icon name="add" className="size-3.5 text-brand" />
      {tDashboard("addLocation")}
    </Link>
  );

  return (
    <>
      <BusinessHeader
        title={tToday(`greeting.${greetingKey(new Date(), locations[0]?.timeZone ?? "Europe/Brussels")}`, {
          name: me.name.split(" ")[0],
        })}
        subtitle={`${business.name}, ${t("locationCount", { count: locations.length })}`}
      >
        {addLocation}
      </BusinessHeader>
      <div className="grid flex-1 grid-rows-[auto_1fr] gap-4 lg:gap-5 xl:grid-cols-12">
        {week && <WeekChart {...week} className="min-h-72 xl:col-span-7" />}
        <div className={`grid grid-cols-2 gap-4 lg:gap-5 ${week ? "xl:col-span-5" : "xl:col-span-12 xl:grid-cols-4"}`}>
          <StatTile
            label={t("overview.ready")}
            value={shown(count("ready"))}
            note={where("ready", "noneReady")}
            tone={count("ready") ? "brand" : "plain"}
          />
          <StatTile
            label={t("overview.late")}
            value={shown(count("late"))}
            note={where("late", "noneLate")}
            tone={count("late") ? "danger" : "plain"}
          />
          <StatTile label={t("overview.open")} value={shown(count("open"))} note={where("open", "noneOpen")} />
          <StatTile
            label={t("monthlyCost")}
            value={format.number(cost, moneyOptions(cost))}
            note={t("overview.paying", { paying: payingCount(locations), total: locations.length })}
          />
        </div>
        <Panel as="section" padding="none" className="flex flex-col overflow-clip xl:col-span-8">
          <h2 className="px-5 pt-5 pb-4 text-title-h6 lg:px-7 lg:pt-6">{t("nav.locations")}</h2>
          {locations.length > 0 ? (
            <>
              <div className={`${BAND} ${GRID}`}>
                <span>{t("overview.location")}</span>
                <span>{t("overview.plan")}</span>
                <span className="text-right">{t("overview.open")}</span>
                <span className="text-right">{t("overview.ready")}</span>
                <span className="text-right">{t("overview.late")}</span>
              </div>
              <ul className="flex flex-col gap-1 p-2 lg:p-3">
                {locations.map((location) => (
                  <LocationRow key={location.id} location={location} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              illustration="box"
              title={t("overview.emptyTitle")}
              description={t("overview.emptyHint")}
              action={addLocation}
            />
          )}
        </Panel>
        <Panel as="section" padding="none" className="flex max-h-[32rem] min-h-72 flex-col xl:col-span-4 xl:max-h-none">
          <h2 className="px-5 pt-5 pb-3 text-title-h6 lg:px-6 lg:pt-6">{t("attention.title")}</h2>
          {attention.length > 0 ? (
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 lg:px-3">
              {attention.map((item) => (
                <AttentionRow key={`${item.kind}-${item.location.id}`} item={item} />
              ))}
            </ul>
          ) : (
            <EmptyState illustration="chill" title={t("attention.clearTitle")} description={t("attention.clearHint")} />
          )}
        </Panel>
      </div>
    </>
  );
}
