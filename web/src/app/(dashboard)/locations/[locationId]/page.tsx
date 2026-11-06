import { calendarDateIn, ERASED_CUSTOMER_NAME } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusTone } from "@/components/status-pill";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import { buttonClass } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { addDays } from "@/lib/calendar-grid";
import { getMe } from "@/lib/me";
import { getDaysToChoosePlan, getLocation, getOverview } from "./location-data";
import { ComingUp } from "./overview/coming-up";
import { FirstTicket } from "./overview/first-ticket";
import { NeedsYou } from "./overview/needs-you";
import { WeekChart } from "./overview/week-chart";
import { PageHeader } from "./page-header";
import { isManager } from "./sections";
import { QueueHeader, TicketRow } from "./tickets/ticket-row";
import { daysBetween, expected, LONG_WAIT_DAYS, parseFilter, type Filter } from "./tickets/ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;
const MORNING_ENDS = 12;
const AFTERNOON_ENDS = 18;
const COMING_DAYS = 5;

function greetingKey(now: Date, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < MORNING_ENDS) return "morning";
  return hour < AFTERNOON_ENDS ? "afternoon" : "evening";
}

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
      className={`flex min-w-0 flex-col items-start rounded-sheet border p-4 transition-colors lg:p-6 ${
        lime ? "border-brand bg-brand hover:bg-brand-hover" : "border-border bg-surface hover:bg-subtle"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 text-label-sm">{label}</span>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            lime ? "bg-pine text-brand" : late ? "bg-danger-subtle text-danger" : "bg-subtle text-muted"
          }`}
        >
          <Icon name={icon} className="size-3.5" />
        </span>
      </span>
      <span
        className={`mt-2 text-[2.5rem] leading-[3rem] font-bold tracking-tight lg:text-[3.25rem] lg:leading-[3.75rem] ${
          late ? "text-danger" : ""
        }`}
      >
        {value}
      </span>
      <span className={`mt-0.5 text-p-sm ${lime ? "text-ink" : "text-muted"}`}>{sub}</span>
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
      locationId={locationId}
      title={t(`greeting.${greetingKey(now, timeZone)}`, { name: me.name.split(" ")[0] })}
      subtitle={date.charAt(0).toUpperCase() + date.slice(1)}
    />
  );
  const thanks = search.checkout === "success" && <Banner>{t("thanks")}</Banner>;

  const handedThisWeek = handedOver.days.some(({ count }) => count > 0) || handedOver.previousWeek > 0;
  if (counts.open === 0 && !handedThisWeek) {
    return (
      <>
        {header}
        {thanks}
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
  const rows =
    filter === "all"
      ? tickets
      : filter === "late"
        ? late
        : tickets.filter(({ currentStatus }) => statusTone(currentStatus.code) === filter);
  const filterHref = (next: Filter) => `/locations/${locationId}${next === "all" ? "" : `?filter=${next}`}`;
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
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      {header}
      {thanks}
      <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
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
        {/* One grid with the stats, so every tile shares their edges. On a
            phone what needs doing comes straight after the stats. */}
        <WeekChart
          days={handedOver.days}
          previousWeek={handedOver.previousWeek}
          className="col-span-2 max-md:order-1"
        />
        <ComingUp days={comingUp} className="col-span-2 max-md:order-1 md:col-span-1" />
        <NeedsYou
          locationId={locationId}
          className="col-span-2 md:col-span-1"
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
      </div>

      <Panel
        as="section"
        id="open-tickets"
        aria-labelledby="open-tickets-title"
        padding="none"
        className="scroll-mt-4 overflow-clip"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <h2 id="open-tickets-title" className="text-title-h6">
            {t("openTickets")}
          </h2>
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
            ).map(([id, count]) => ({
              href: filterHref(id),
              label: t(`filters.${id}`),
              count,
              current: filter === id,
            }))}
          />
        </div>
        {rows.length > 0 ? (
          <>
            <QueueHeader />
            <ul>
              {rows.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} locationId={locationId} timeZone={timeZone} today={today} />
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon="check" title={t("noneHere")} description={t("noneHereHint")} />
        )}
        <div className="flex justify-center border-t border-border p-3">
          <Link
            href={`/locations/${locationId}/tickets?view=all`}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            {t("allTickets")}
            <Icon name="arrow-right" className="size-2.5" />
          </Link>
        </div>
      </Panel>
    </>
  );
}
