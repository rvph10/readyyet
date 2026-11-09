import { calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Reveal } from "@/components/reveal";

// Someone may be waiting on an answer, so a tab left open has to show it.
const REFRESH_EVERY_MS = 60 * 1000;
const PAGE_SIZE = 20;

// ADR 0096: the page the "new private feedback" email leads to. ADR 0119: the
// header and the tabs stand at once, the messages wait in their own panels.
export default async function FeedbackPage({ params, searchParams }: PageProps<"/locations/[locationId]/feedback">) {
  const [{ locationId }, search, { memberships }, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("feedback"),
  ]);
  const membership = memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const view = parseView(search.view);
  const page = parsePage(search.page);

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader title={t("pageTitle")} />
      {/* Keyed, so another tab or page shows its messages loading straight away. */}
      <Reveal key={`${view}:${page}`} fallback={<FeedbackLoading locationId={locationId} view={view} />}>
        <FeedbackContent locationId={locationId} view={view} page={page} />
      </Reveal>
    </div>
  );
}

function ViewTabs({ locationId, view, waiting }: { locationId: string; view: View; waiting: number | undefined }) {
  const t = useTranslations("feedback");
  return (
    <Tabs
      label={t("viewsLabel")}
      tabs={(Object.keys(VIEWS) as View[]).map((name) => ({
        href: feedbackHref(locationId, { view: name }),
        label: t(`views.${name}`),
        current: name === view,
        count: name === "waiting" ? waiting : undefined,
      }))}
    />
  );
}

async function FeedbackContent({ locationId, view, page }: { locationId: string; view: View; page: number }) {
  const [t, tDetail, locale, client] = await Promise.all([
    getTranslations("feedback"),
    getTranslations("ticketDetail"),
    getLocale(),
    api(),
  ]);
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

  const tabs = <ViewTabs locationId={locationId} view={view} waiting={overview.counts.unhandledFeedback} />;

  return list.items.length === 0 ? (
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
        <Banner action={{ href: fixHref, label: t(`blocked.${block}.action`) }}>{t(`blocked.${block}.notice`)}</Banner>
      )}
      <FeedbackBoard
        locationId={locationId}
        shopName={location.name}
        items={list.items.map((item) => ({
          ...item,
          receivedShown: moment(item.createdAt),
          handledShown: item.handledAt && moment(item.handledAt),
          waitingDays: item.handledAt ? null : daysBetween(calendarDateIn(new Date(item.createdAt), timeZone), today),
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
  );
}

const ROWS_WHILE_LOADING = 5;

// FeedbackBoard's two panels, the reader and the messages, with the tabs.
function FeedbackLoading({ locationId, view }: { locationId: string; view: View }) {
  return (
    <div
      aria-busy="true"
      className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:gap-5"
    >
      <Panel padding="none" className="flex flex-col gap-4 p-5 lg:p-7">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full!" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>
        </div>
        <Skeleton className="mt-2 h-28 rounded-2xl!" />
        <Skeleton className="h-11 w-48 rounded-full!" />
      </Panel>
      <Panel className="flex min-h-0 flex-col">
        <ViewTabs locationId={locationId} view={view} waiting={undefined} />
        <ul className="mt-3 flex flex-col gap-1">
          {Array.from({ length: ROWS_WHILE_LOADING }, (_, row) => (
            <li key={row} className="flex items-center gap-3 p-3">
              <Skeleton className="size-10 shrink-0 rounded-full!" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3 w-48 max-w-full" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
