import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { SheetTitle } from "@/components/sheet-title";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { formatDay, formatMoment } from "../locations/[locationId]/tickets/ticket-views";
import { GrowthTile } from "./growth-tile";
import { SubscriptionSplit } from "./subscription-split";

// The API counts weeks from a Brussels Monday (ADR 0161).
const TIME_ZONE = "Europe/Brussels";

// ADR 0161: how ReadyYet grows, and who just signed up.
export default async function OverviewPage() {
  const [client, t, tDetail, locale] = await Promise.all([
    api(),
    getTranslations("admin.overview"),
    getTranslations("ticketDetail"),
    getLocale(),
  ]);
  const overview = await client.GET("/admin/overview").then(pageData);
  const today = calendarDateIn(new Date(), TIME_ZONE);
  const weeks = overview.users.weeks.map(({ week }) => week);
  const bar = (unit: "users" | "locations" | "tickets") => (week: string, count: number) => {
    const day = formatDay(week, today, locale);
    const amount = t(`units.${unit}`, { count });
    // Twelve dates don't fit under twelve bars: one in three, this week's included.
    const named = (weeks.length - 1 - weeks.indexOf(week)) % 3 === 0;
    return { label: named ? day : "", description: t("weekOf", { day, amount }), tooltip: amount };
  };
  const caption = (lastWeekSoFar: number) => t("thisWeek", { count: lastWeekSoFar });

  return (
    <>
      <SheetTitle title={t("title")} subtitle={t("subtitle")} />
      <div className="grid flex-1 grid-cols-1 content-start items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <GrowthTile
          className="xl:col-span-7"
          title={t("users")}
          series={overview.users}
          caption={caption(overview.users.lastWeekSoFar)}
          chartLabel={t("chartLabel", { what: t("users") })}
          bar={bar("users")}
        />
        <GrowthTile
          className="xl:col-span-5"
          title={t("tickets")}
          series={overview.tickets}
          caption={caption(overview.tickets.lastWeekSoFar)}
          chartLabel={t("chartLabel", { what: t("tickets") })}
          bar={bar("tickets")}
        />

        <Panel as="section" padding="none" className="overflow-clip xl:col-span-7">
          <h2 className="px-5 pt-5 pb-4 text-title-h6 lg:px-7 lg:pt-6">{t("latest.title")}</h2>
          {overview.latestSignups.length === 0 ? (
            <EmptyState
              illustration="user"
              title={t("latest.empty.title")}
              description={t("latest.empty.description")}
            />
          ) : (
            <ul className="flex flex-col gap-1 p-2 lg:p-3">
              {overview.latestSignups.map((signup) => (
                <li
                  key={signup.id}
                  className="grid grid-cols-1 items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:px-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar id={signup.id} name={signup.name} src={null} className="lg:size-12! lg:text-base!" />
                    <span className="min-w-0">
                      <span title={signup.name} className="block truncate text-label-md">
                        {signup.name}
                      </span>
                      <span title={signup.email} className="block truncate text-p-xs text-muted">
                        {signup.email}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-0.5 pl-13 sm:items-end sm:pl-0 sm:text-right">
                    <span className="text-label-sm whitespace-nowrap">
                      {formatMoment(new Date(signup.createdAt), TIME_ZONE, today, locale, (parts) =>
                        tDetail("moment", parts),
                      )}
                    </span>
                    <span className="max-w-56 truncate text-p-xs text-muted">
                      {signup.businessName
                        ? t("latest.shop", {
                            name: signup.businessName,
                            locations: signup.locations,
                            tickets: signup.tickets,
                          })
                        : t("latest.noBusiness")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <GrowthTile
          className="xl:col-span-5"
          title={t("locations")}
          series={overview.locations}
          caption={caption(overview.locations.lastWeekSoFar)}
          chartLabel={t("chartLabel", { what: t("locations") })}
          bar={bar("locations")}
        >
          <SubscriptionSplit locations={overview.locations} />
        </GrowthTile>
      </div>
    </>
  );
}
