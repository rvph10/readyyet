import { calendarDateIn } from "@readyyet/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { IllustrationName } from "@/components/illustration";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { lastPage, parsePage } from "@/lib/pagination";
import { parseSort, type Sort } from "@/lib/sort";
import { NewTicketButton } from "../new-ticket/new-ticket-button";
import { getLocation, getOverview } from "../location-data";
import { PageHeader } from "../page-header";
import { ListHeader, TicketRow } from "./ticket-row";
import { LIST_SORTS, parseQuery, parseView, ticketsHref, VIEWS, type ListSort, type View } from "./ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;
const PAGE_SIZE = 50;
const NEWEST_FIRST: Sort<ListSort> = { column: "received", dir: "desc" };

const EMPTY_ILLUSTRATIONS: Record<View, IllustrationName> = {
  open: "coffee",
  ready: "box",
  late: "chill",
  collected: "done",
  all: "tag",
};

// For looking something up, so newest first and with every Ticket. Today is
// where the day's work is sorted by urgency (ADR 0088).
export default async function TicketsPage({ params, searchParams }: PageProps<"/locations/[locationId]/tickets">) {
  const [{ locationId }, search, t, client] = await Promise.all([
    params,
    searchParams,
    getTranslations("tickets"),
    api(),
  ]);
  const view = parseView(search.view);
  const q = parseQuery(search.q);
  const page = parsePage(search.page);
  const sort = parseSort(search, LIST_SORTS);

  const [list, location, overview] = await Promise.all([
    client
      .GET("/locations/{locationId}/tickets", {
        params: {
          path: { locationId },
          query: { ...VIEWS[view], q: q || undefined, page, take: PAGE_SIZE, sort: sort?.column, dir: sort?.dir },
        },
      })
      .then(pageData),
    getLocation(locationId),
    getOverview(locationId),
  ]);

  // Colleagues moved Tickets on, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(ticketsHref(locationId, { view, q, sort, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const today = calendarDateIn(new Date(), location.timeZone);
  const { counts } = overview;
  const viewCounts: Partial<Record<View, number>> = {
    open: counts.open,
    ready: counts.ready,
    late: counts.late,
    collected: counts.toConfirm,
  };
  // Only there with something to do, so its appearing is the signal.
  const views = (Object.keys(VIEWS) as View[]).filter((name) => name !== "collected" || counts.toConfirm > 0);

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader title={t("title")} subtitle={q ? t("resultsFor", { query: q }) : undefined} />
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <Tabs
            label={t("viewsLabel")}
            tabs={views.map((name) => ({
              href: ticketsHref(locationId, { view: name, q, sort }),
              label: t(`views.${name}`),
              count: q ? undefined : viewCounts[name],
              current: name === view,
            }))}
          />
          {q && (
            <Link
              href={ticketsHref(locationId, { view, sort })}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {t("clearSearch")}
            </Link>
          )}
        </div>
        {list.items.length > 0 ? (
          <>
            <ListHeader sort={sort ?? NEWEST_FIRST} href={(next) => ticketsHref(locationId, { view, q, sort: next })} />
            <ul>
              {list.items.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  locationId={locationId}
                  timeZone={location.timeZone}
                  today={today}
                  list
                />
              ))}
            </ul>
          </>
        ) : q ? (
          <EmptyState
            illustration="search"
            title={t("noMatch", { query: q })}
            description={t("noMatchHint")}
            action={
              view !== "all" && (
                <Link
                  href={ticketsHref(locationId, { view: "all", q, sort })}
                  className={buttonClass({ variant: "secondary" })}
                >
                  {t("searchAll")}
                </Link>
              )
            }
          />
        ) : (
          <EmptyState
            illustration={EMPTY_ILLUSTRATIONS[view]}
            title={t(`empty.${view}.title`)}
            description={t(`empty.${view}.description`)}
            action={(view === "open" || view === "all") && <NewTicketButton />}
          />
        )}
        {list.total > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.total}
            href={(number) => ticketsHref(locationId, { view, q, sort, page: number })}
            className="mt-auto border-t border-border px-5 py-3 lg:px-7"
          />
        )}
      </Panel>
    </>
  );
}
