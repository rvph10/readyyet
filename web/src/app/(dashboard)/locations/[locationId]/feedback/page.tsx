import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { lastPage, parsePage } from "@/lib/pagination";
import { getMe } from "@/lib/me";
import { getBilling, getLocation, getOverview } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { daysBetween, formatMoment } from "../tickets/ticket-views";
import { FeedbackBoard } from "./feedback-board";
import { feedbackBlock, feedbackHref, parseView, VIEWS, type View } from "./feedback-views";

// Someone may be waiting on an answer, so a tab left open has to show it.
const REFRESH_EVERY_MS = 60 * 1000;
const PAGE_SIZE = 20;

// ADR 0096: the page the "new private feedback" email leads to.
export default async function FeedbackPage({ params, searchParams }: PageProps<"/locations/[locationId]/feedback">) {
  const [{ locationId }, search, { memberships }, t, tDetail, locale, client] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("feedback"),
    getTranslations("ticketDetail"),
    getLocale(),
    api(),
  ]);
  const membership = memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const view = parseView(search.view);
  const page = parsePage(search.page);

  const [list, location, billing, overview] = await Promise.all([
    client
      .GET("/locations/{locationId}/feedback", {
        params: { path: { locationId }, query: { handled: VIEWS[view], take: PAGE_SIZE, page } },
      })
      .then(pageData),
    getLocation(locationId),
    getBilling(locationId),
    getOverview(locationId),
  ]);

  // Feedback was handled, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(feedbackHref(locationId, { view, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const { timeZone } = location;
  const today = calendarDateIn(new Date(), timeZone);
  const moment = (instant: string) =>
    formatMoment(new Date(instant), timeZone, today, locale, (parts) => tDetail("moment", parts));
  const block = feedbackBlock(location, billing);
  const fixHref = `/locations/${locationId}/${block === "plan" ? "billing" : "settings?section=reviews"}`;

  const tabs = (
    <Tabs
      label={t("viewsLabel")}
      tabs={(Object.keys(VIEWS) as View[]).map((name) => ({
        href: feedbackHref(locationId, { view: name }),
        label: t(`views.${name}`),
        current: name === view,
        count: name === "waiting" ? overview.counts.unhandledFeedback : undefined,
      }))}
    />
  );

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader title={t("pageTitle")} />
      {list.items.length === 0 ? (
        <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="px-5 pt-5 lg:px-7 lg:pt-6">{tabs}</div>
          {block && view === "waiting" ? (
            <EmptyState
              illustration="messages"
              title={t(`blocked.${block}.title`)}
              description={t(`blocked.${block}.description`)}
              action={
                <Link href={fixHref} className={buttonClass()}>
                  {t(`blocked.${block}.action`)}
                </Link>
              }
            />
          ) : (
            <EmptyState
              illustration={view === "waiting" ? "chill" : "inbox"}
              title={t(`empty.${view}.title`)}
              description={t(`empty.${view}.description`)}
            />
          )}
        </Panel>
      ) : (
        <>
          {block && (
            <Banner action={{ href: fixHref, label: t(`blocked.${block}.action`) }}>
              {t(`blocked.${block}.notice`)}
            </Banner>
          )}
          <FeedbackBoard
            // A row chosen in one tab or page means nothing in another.
            key={`${view}-${page}`}
            locationId={locationId}
            shopName={location.name}
            start={typeof search.message === "string" ? search.message : null}
            items={list.items.map((item) => ({
              ...item,
              receivedShown: moment(item.createdAt),
              handledShown: item.handledAt && moment(item.handledAt),
              waitingDays: item.handledAt
                ? null
                : daysBetween(calendarDateIn(new Date(item.createdAt), timeZone), today),
            }))}
            tabs={tabs}
            pager={
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={list.total}
                href={(number) => feedbackHref(locationId, { view, page: number })}
                className="mt-3 border-t border-border pt-3"
              />
            }
          />
        </>
      )}
    </div>
  );
}
