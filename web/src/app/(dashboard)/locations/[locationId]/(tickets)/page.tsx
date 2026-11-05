import { calendarDateIn } from "@readyyet/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { TicketSearch } from "./ticket-search";
import { TicketTable } from "./ticket-table";
import { parseQuery, parseView, ticketsHref, VIEWS, type View } from "./ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;

export default async function TicketsPage({ params, searchParams }: PageProps<"/locations/[locationId]">) {
  const [{ locationId }, search, t, client] = await Promise.all([
    params,
    searchParams,
    getTranslations("tickets"),
    api(),
  ]);
  const view = parseView(search.view);
  const q = parseQuery(search.q);
  const cursor = typeof search.cursor === "string" ? search.cursor : undefined;
  const path = { path: { locationId } };

  const [page, toConfirm, location] = await Promise.all([
    client
      .GET("/locations/{locationId}/tickets", {
        params: { ...path, query: { ...VIEWS[view], q: q || undefined, cursor } },
      })
      .then(pageData),
    client
      .GET("/locations/{locationId}/tickets", { params: { ...path, query: { ...VIEWS.collected, take: 1 } } })
      .then(pageData),
    client.GET("/locations/{locationId}", { params: path }).then(pageData),
  ]);

  const today = calendarDateIn(new Date(), location.timeZone);
  // Only there with something to do, so its appearing is the signal.
  const views = (Object.keys(VIEWS) as View[]).filter(
    (name) => name !== "collected" || view === "collected" || toConfirm.items.length > 0,
  );
  const newTicket = (
    <Link href={`/locations/${locationId}/tickets/new`} className={`${buttonClass()} inline-flex items-center gap-2`}>
      <Icon name="add" className="size-3.5" />
      {t("new")}
    </Link>
  );

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-label-xl md:text-title-h4">{t("title")}</h1>
        {newTicket}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label={t("viewsLabel")}
          tabs={views.map((name) => ({
            href: ticketsHref(locationId, { view: name, q }),
            label: t(`views.${name}`),
            current: name === view,
          }))}
        />
        <TicketSearch
          locationId={locationId}
          view={view}
          q={q}
          label={t("search")}
          placeholder={t("searchPlaceholder")}
        />
      </div>
      <Panel padding="none">
        {page.items.length > 0 ? (
          <TicketTable tickets={page.items} locationId={locationId} timeZone={location.timeZone} today={today} />
        ) : q ? (
          <EmptyState
            icon="search"
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
            icon="inbox"
            title={t(`empty.${view}.title`)}
            description={t(`empty.${view}.description`)}
            action={(view === "open" || view === "all") && newTicket}
          />
        )}
      </Panel>
      {(cursor || page.nextCursor) && (
        <nav className="flex flex-wrap justify-center gap-3 pb-1">
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
    </>
  );
}
