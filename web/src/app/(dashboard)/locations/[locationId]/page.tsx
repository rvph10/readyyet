import { calendarDateIn, ERASED_CUSTOMER_NAME } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusTone } from "@/components/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { buttonClass } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { addDays } from "@/lib/calendar-grid";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { parseSort, setSort, type Sort } from "@/lib/sort";
import { getBilling, getDaysToChoosePlan, getLocation, getOverview } from "./location-data";
import { ComingUp } from "./overview/coming-up";
import { FirstTicket } from "./overview/first-ticket";
import { NeedsYou } from "./overview/needs-you";
import { PlanCelebration } from "./overview/plan-celebration";
import { WeekChart } from "./overview/week-chart";
import { PageHeader } from "./page-header";
import { parsePlan } from "./plan-prices";
import { isManager } from "./sections";
import { QueueHeader, TicketRow } from "./tickets/ticket-row";
import {
  daysBetween,
  expected,
  intlLocale,
  LONG_WAIT_DAYS,
  parseFilter,
  QUEUE_SORTS,
  type Filter,
  type QueueSort,
} from "./tickets/ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;
const COMING_DAYS = 4;

function Stat({
  href,
  icon,
  label,
  value,
  sub,
  tone = "plain",
}: {
  href: string;
  icon: IconName;
  label: string;
  value: number;
  sub: string;
  tone?: "plain" | "lime" | "late";
}) {
  const lime = tone === "lime";
  const late = tone === "late" && value > 0;
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col items-start rounded-sheet border p-4 transition-colors ${
        lime ? "border-brand bg-brand hover:bg-brand-hover" : "border-border bg-surface hover:bg-subtle"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 truncate text-label-sm">{label}</span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            lime
              ? "bg-pine text-brand"
              : `xl:max-[88rem]:hidden ${late ? "bg-danger-subtle text-danger" : "bg-subtle text-muted"}`
          }`}
        >
          <Icon name={icon} className="size-3" />
        </span>
      </span>
      <span
        className={`font-bold tracking-tight ${lime ? "text-[3.25rem] leading-[3.5rem]" : "text-[2.5rem] leading-[3.5rem]"} ${
          late ? "text-danger" : ""
        }`}
      >
        {value}
      </span>
      <span className={`text-p-sm ${lime ? "text-ink" : "text-muted"}`}>{sub}</span>
    </Link>
  );
}

// ADR 0088: a Location opens on what its day looks like and what needs someone.
export default async function TodayPage({ params, searchParams }: PageProps<"/locations/[locationId]">) {
  const [{ locationId }, search, t, tTickets, locale, me, client] = await Promise.all([
    params,
    searchParams,
    getTranslations("today"),
    getTranslations("tickets"),
    getLocale(),
    getMe(),
    api(),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership) notFound();
  const manager = isManager(membership.role);

  const [location, overview, trialDaysLeft, feedback] = await Promise.all([
    getLocation(locationId),
    getOverview(locationId),
    getDaysToChoosePlan(locationId, membership.role),
    manager
      ? client
          .GET("/locations/{locationId}/feedback", {
            params: { path: { locationId }, query: { handled: "false", take: 1 } },
          })
          .then(pageData)
      : null,
  ]);

  const now = new Date();
  const { timeZone } = location;
  // The webhook can still be on its way, but the trial's end doesn't change
  // with it. Only Checkout knows if the trial was kept: too near its end, the
  // card is charged at once.
  const billing = manager && search.checkout === "success" ? await getBilling(locationId) : null;
  const trialEnd = billing?.trialEndsAt ? new Date(billing.trialEndsAt) : null;
  const today = calendarDateIn(now, timeZone);
  const { counts, tickets, steps, handedOver } = overview;
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const header = (
    <PageHeader
      title={t(`greeting.${greetingKey(now, timeZone)}`, { name: me.name.split(" ")[0] })}
      subtitle={date.charAt(0).toUpperCase() + date.slice(1)}
    />
  );
  const celebration = search.checkout === "success" && (
    <PlanCelebration
      locationId={locationId}
      locationName={location.name}
      plan={parsePlan(search.plan)}
      firstPayment={
        search.trial === "kept" && trialEnd && trialEnd > now
          ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone }).format(trialEnd)
          : null
      }
    />
  );

  const handedThisWeek = handedOver.days.some(({ count }) => count > 0) || handedOver.previousWeek > 0;
  if (counts.open === 0 && !handedThisWeek) {
    return (
      <>
        {header}
        {celebration}
        <FirstTicket />
      </>
    );
  }

  const filter = parseFilter(search.filter);
  const isLate = (ticket: (typeof tickets)[number]) =>
    expected(ticket.estimatedReadyDate, ticket.currentStatus.code, today)?.key === "late";
  const name = (ticket: (typeof tickets)[number]) =>
    ticket.customer.fullName === ERASED_CUSTOMER_NAME ? tTickets("erasedCustomer") : ticket.customer.fullName;
  const readySince = (ticket: (typeof tickets)[number]) =>
    daysBetween(calendarDateIn(new Date(ticket.statusSince), timeZone), today);

  const ready = tickets.filter(({ currentStatus }) => currentStatus.code === "READY");
  const late = tickets.filter(isLate);
  const stages = { received: 0, working: 0, waiting: 0 };
  for (const { status, count } of steps) {
    const tone = statusTone(status.code);
    if (tone in stages) stages[tone as keyof typeof stages] += count;
  }
  const filtered =
    filter === "all"
      ? tickets
      : filter === "late"
        ? late
        : tickets.filter(({ currentStatus }) => statusTone(currentStatus.code) === filter);
  const sort = parseSort(search, QUEUE_SORTS);
  const collator = new Intl.Collator(intlLocale(locale));
  const position = new Map(steps.map(({ status }, index) => [status.code, index]));
  const compare: Record<QueueSort, (a: (typeof tickets)[number], b: (typeof tickets)[number]) => number> = {
    customer: (a, b) => collator.compare(name(a), name(b)),
    status: (a, b) => position.get(a.currentStatus.code)! - position.get(b.currentStatus.code)!,
    expected: (a, b) => (a.estimatedReadyDate ?? "").localeCompare(b.estimatedReadyDate ?? ""),
  };
  // Without a sort, the API's order: most urgent first (ADR 0088).
  const rows = sort
    ? [...filtered].sort((a, b) => {
        // Whichever way a date sorts, a Ticket without one has nothing to compare.
        if (sort.column === "expected" && !a.estimatedReadyDate !== !b.estimatedReadyDate) {
          return a.estimatedReadyDate ? -1 : 1;
        }
        return compare[sort.column](a, b) * (sort.dir === "asc" ? 1 : -1);
      })
    : filtered;
  const filterHref = (next: Filter, order: Sort<QueueSort> | null = sort) => {
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    setSort(params, order);
    const query = params.toString();
    return `/locations/${locationId}${query ? `?${query}` : ""}`;
  };
  const comingUp = Array.from({ length: COMING_DAYS }, (_, offset) => {
    const day = addDays(today, offset);
    const weekday = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(new Date(`${day}T00:00:00Z`));
    return {
      date: day,
      label:
        offset === 0
          ? tTickets("today")
          : offset === 1
            ? tTickets("tomorrow")
            : weekday.charAt(0).toUpperCase() + weekday.slice(1),
      customers: tickets
        .filter((ticket) => ticket.estimatedReadyDate === day && ticket.currentStatus.code !== "READY")
        .map((ticket) => ({ id: ticket.id, name: name(ticket) })),
    };
  });
  const longest = Math.max(0, ...ready.map(readySince));
  const latest = Math.max(0, ...late.map(({ estimatedReadyDate }) => daysBetween(estimatedReadyDate!, today)));

  return (
    // ADR 0108: from 1280px the page fits the window and the table scrolls in
    // its tile, as a shop can have 50 open Tickets. Under that the columns
    // dissolve, and what needs doing comes straight after the stats.
    <div className="flex flex-1 flex-col gap-4 lg:gap-5 xl:h-[calc(100dvh-6.5rem)] xl:min-h-[49rem] xl:flex-none">
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      {header}
      {celebration}
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="contents xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:gap-5">
          <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-5">
            <Stat
              href={`${filterHref("ready")}#open-tickets`}
              icon="check"
              label={t("ready")}
              value={counts.ready}
              sub={counts.ready ? t("longestWait", { days: longest }) : t("nothingReady")}
              tone="lime"
            />
            <Stat
              href={`${filterHref("late")}#open-tickets`}
              icon="time"
              label={t("late")}
              value={counts.late}
              sub={counts.late ? t("upToLate", { days: latest }) : t("nothingLate")}
              tone="late"
            />
            <Stat
              href={`${filterHref("all")}#open-tickets`}
              icon="date"
              label={t("dueToday")}
              value={counts.dueToday}
              sub={t("dueTomorrow", { count: counts.dueTomorrow })}
            />
            <Stat
              href={`${filterHref("all")}#open-tickets`}
              icon="settings"
              label={t("inShop")}
              value={counts.inShop}
              sub={t("waitingOnSomeone", { count: stages.waiting })}
            />
          </div>

          <Panel
            as="section"
            id="open-tickets"
            aria-labelledby="open-tickets-title"
            padding="none"
            className="@container flex scroll-mt-4 flex-col overflow-clip max-xl:order-4 md:col-span-2 xl:min-h-0 xl:flex-1"
          >
            <div className="flex flex-col gap-3 px-5 pt-5 pb-3 lg:px-7">
              <div className="flex items-center justify-between gap-4">
                <h2 id="open-tickets-title" className="text-title-h6">
                  {t("openTickets")}
                </h2>
                <Link
                  href={`/locations/${locationId}/tickets?view=all`}
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  {t("allTickets")}
                  <Icon name="arrow-right" className="size-2.5" />
                </Link>
              </div>
              <Tabs
                label={tTickets("viewsLabel")}
                scroll={false}
                tabs={(
                  [
                    ["all", counts.open],
                    ["late", counts.late],
                    ["ready", counts.ready],
                    ["received", stages.received],
                    ["working", stages.working],
                    ["waiting", stages.waiting],
                  ] as const
                )
                  .filter(([id, count]) => count > 0 || id === "all" || id === filter)
                  .map(([id, count]) => ({
                    href: filterHref(id),
                    label: t(`filters.${id}`),
                    count,
                    current: filter === id,
                  }))}
              />
            </div>
            {rows.length > 0 ? (
              <>
                <QueueHeader sort={sort} href={(next) => filterHref(filter, next)} />
                <ul className="min-h-0 flex-1 overflow-y-auto max-xl:max-h-[32rem]">
                  {rows.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      locationId={locationId}
                      timeZone={timeZone}
                      today={today}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState illustration="chill" title={t("noneHere")} description={t("noneHereHint")} />
            )}
          </Panel>
        </div>

        <div className="contents xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:gap-5">
          <NeedsYou
            locationId={locationId}
            className="max-xl:order-1 xl:min-h-44 xl:flex-1"
            trialDaysLeft={trialDaysLeft !== null && trialDaysLeft <= 3 ? trialDaysLeft : null}
            feedback={feedback?.items[0] ?? null}
            feedbackCount={manager ? counts.unhandledFeedback : 0}
            collected={tickets
              .filter((ticket) => ticket.customerCollectedAt)
              .map((ticket) => ({ id: ticket.id, name: name(ticket) }))}
            failing={tickets
              .filter((ticket) => ticket.emailFails)
              .map((ticket) => ({ id: ticket.id, name: name(ticket) }))}
            longWaits={ready
              .filter((ticket) => !ticket.customerCollectedAt && readySince(ticket) >= LONG_WAIT_DAYS)
              .map((ticket) => ({ id: ticket.id, name: name(ticket), days: readySince(ticket) }))}
          />
          <ComingUp days={comingUp} className="max-xl:order-2" />
          <WeekChart
            days={handedOver.days}
            previousWeek={handedOver.previousWeek}
            className="max-xl:order-3 md:col-span-2"
          />
        </div>
      </div>
    </div>
  );
}
