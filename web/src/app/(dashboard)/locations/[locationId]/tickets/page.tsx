import { calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { IllustrationName } from "@/components/illustration";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { RowsPlaceholder } from "@/components/rows-placeholder";
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
import { Reveal } from "@/components/reveal";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;
const PAGE_SIZE = 50;
const ROWS_WHILE_LOADING = 9;
const NEWEST_FIRST: Sort<ListSort> = { column: "received", dir: "desc" };

const EMPTY_ILLUSTRATIONS: Record<View, IllustrationName> = {
  open: "coffee",
  ready: "box",
  late: "chill",
  collected: "done",
  all: "tag",
};

interface Query {
  locationId: string;
  view: View;
  q: string;
  page: number;
  sort: Sort<ListSort> | null;
}

// For looking something up, so newest first and with every Ticket. Today is
// where the day's work is sorted by urgency (ADR 0088). ADR 0119: the tabs and
// the list each wait for their own data.
export default async function TicketsPage({ params, searchParams }: PageProps<"/locations/[locationId]/tickets">) {
  const [{ locationId }, search, t] = await Promise.all([params, searchParams, getTranslations("tickets")]);
  const query: Query = {
    locationId,
    view: parseView(search.view),
    q: parseQuery(search.q),
    page: parsePage(search.page),
    sort: parseSort(search, LIST_SORTS),
  };
  const { view, q, sort } = query;

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader title={t("title")} subtitle={q ? t("resultsFor", { query: q }) : undefined} />
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <Reveal fallback={<ViewTabs query={query} counts={null} />}>
            <CountedTabs query={query} />
          </Reveal>
          {q && (
            <Link
              href={ticketsHref(locationId, { view, sort })}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {t("clearSearch")}
            </Link>
          )}
        </div>
        {/* Keyed, so another tab or page shows its rows loading straight away. */}
        <Reveal
          key={`${view}:${q}:${query.page}:${sort?.column}:${sort?.dir}`}
          fallback={
            <>
              <ListHeader
                sort={sort ?? NEWEST_FIRST}
                href={(next) => ticketsHref(locationId, { view, q, sort: next })}
              />
              <RowsPlaceholder rows={ROWS_WHILE_LOADING} columns={3} />
            </>
          }
        >
          <TicketList query={query} />
        </Reveal>
      </Panel>
    </>
  );
}

type Counts = Awaited<ReturnType<typeof getOverview>>["counts"];

async function CountedTabs({ query }: { query: Query }) {
  const { counts } = await getOverview(query.locationId);
  return <ViewTabs query={query} counts={counts} />;
}

// Without counts yet, every tab but "To confirm", which only shows with
// something in it, so its appearing is the signal.
function ViewTabs({ query, counts }: { query: Query; counts: Counts | null }) {
  const t = useTranslations("tickets");
  const { locationId, view, q, sort } = query;
  const viewCounts: Partial<Record<View, number>> = counts
    ? { open: counts.open, ready: counts.ready, late: counts.late, collected: counts.toConfirm }
    : {};
  const views = (Object.keys(VIEWS) as View[]).filter(
    (name) => name !== "collected" || (counts?.toConfirm ?? 0) > 0 || name === view,
  );
  return (
    <Tabs
      label={t("viewsLabel")}
      tabs={views.map((name) => ({
        href: ticketsHref(locationId, { view: name, q, sort }),
        label: t(`views.${name}`),
        count: q ? undefined : viewCounts[name],
        current: name === view,
      }))}
    />
  );
}

async function TicketList({ query }: { query: Query }) {
  const { locationId, view, q, page, sort } = query;
  const [t, client] = await Promise.all([getTranslations("tickets"), api()]);
  const [list, location] = await Promise.all([
    client
      .GET("/locations/{locationId}/tickets", {
        params: {
          path: { locationId },
          query: { ...VIEWS[view], q: q || undefined, page, take: PAGE_SIZE, sort: sort?.column, dir: sort?.dir },
        },
      })
      .then(pageData),
    getLocation(locationId),
  ]);

  // Colleagues moved Tickets on, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(ticketsHref(locationId, { view, q, sort, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const today = calendarDateIn(new Date(), location.timeZone);
  return (
    <>
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
    </>
  );
}
