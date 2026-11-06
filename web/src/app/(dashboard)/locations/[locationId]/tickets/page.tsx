import { calendarDateIn } from "@readyyet/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { IllustrationName } from "@/components/illustration";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { NewTicketButton } from "../new-ticket/new-ticket-button";
import { getLocation, getOverview } from "../location-data";
import { PageHeader } from "../page-header";
import { ListHeader, TicketRow } from "./ticket-row";
import { parseQuery, parseView, ticketsHref, VIEWS, type View } from "./ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;

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
  const cursor = typeof search.cursor === "string" ? search.cursor : undefined;

  const [page, location, overview] = await Promise.all([
    client
      .GET("/locations/{locationId}/tickets", {
        params: { path: { locationId }, query: { ...VIEWS[view], q: q || undefined, cursor } },
      })
      .then(pageData),
    getLocation(locationId),
    getOverview(locationId),
  ]);

  // Colleagues moved the Tickets of this older page on, which says nothing
  // about the view as a whole.
  if (cursor && page.items.length === 0) {
    redirect(ticketsHref(locationId, { view, q }));
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
      <PageHeader locationId={locationId} title={t("title")} subtitle={q ? t("resultsFor", { query: q }) : undefined} />
      <Panel padding="none" className="overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <Tabs
            label={t("viewsLabel")}
            tabs={views.map((name) => ({
              href: ticketsHref(locationId, { view: name, q }),
              label: t(`views.${name}`),
              count: q ? undefined : viewCounts[name],
              current: name === view,
            }))}
          />
          {q && (
            <Link
              href={ticketsHref(locationId, { view })}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {t("clearSearch")}
            </Link>
          )}
        </div>
        {page.items.length > 0 ? (
          <>
            <ListHeader />
            <ul>
              {page.items.map((ticket) => (
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
                  href={ticketsHref(locationId, { view: "all", q })}
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
        {(cursor || page.nextCursor) && (
          <nav className="flex flex-wrap justify-center gap-3 border-t border-border p-4">
            {cursor && (
              <Link href={ticketsHref(locationId, { view, q })} className={buttonClass({ variant: "secondary" })}>
                {t("newest")}
              </Link>
            )}
            {page.nextCursor && (
              <Link
                href={ticketsHref(locationId, { view, q, cursor: page.nextCursor })}
                className={buttonClass({ variant: "secondary" })}
              >
                {t("older")}
              </Link>
            )}
          </nav>
        )}
      </Panel>
    </>
  );
}
