import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { getBilling, getInsights, getLocation, getOverview } from "./location-data";
import { ActivityTile } from "./overview/activity-tile";
import { FirstTicket } from "./overview/first-ticket";
import { MonthTile } from "./overview/month-tile";
import { PlanCelebration } from "./overview/plan-celebration";
import { PromiseTile } from "./overview/promise-tile";
import { SetupTile, type SetupStep } from "./overview/setup-tile";
import { TodayHero } from "./overview/today-hero";
import { UpdatesTile } from "./overview/updates-tile";
import { YourDayTile } from "./overview/your-day-tile";
import { PageHeader } from "./page-header";
import { parsePlan } from "./plan-prices";
import { isManager } from "./sections";
import { TicketRow } from "./tickets/ticket-row";
import { daysBetween, expected, formatMoment, intlLocale } from "./tickets/ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;
const UP_NEXT = 6;

// ADR 0116, replacing ADR 0088's grid: a Location opens on a welcome, the day's
// numbers, the month in numbers, what to do next and who did what.
export default async function TodayPage({ params, searchParams }: PageProps<"/locations/[locationId]">) {
  const [{ locationId }, search, t, tDetail, locale, me] = await Promise.all([
    params,
    searchParams,
    getTranslations("today"),
    getTranslations("ticketDetail"),
    getLocale(),
    getMe(),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership) notFound();
  const manager = isManager(membership.role);

  const [location, overview, insights] = await Promise.all([
    getLocation(locationId),
    getOverview(locationId),
    getInsights(locationId),
  ]);

  const now = new Date();
  const { timeZone } = location;
  // The webhook can still be on its way, but the trial's end doesn't change
  // with it. Only Checkout knows if the trial was kept: too near its end, the
  // card is charged at once.
  const billing = manager && search.checkout === "success" ? await getBilling(locationId) : null;
  const trialEnd = billing?.trialEndsAt ? new Date(billing.trialEndsAt) : null;
  const today = calendarDateIn(now, timeZone);
  const { counts, tickets } = overview;
  const { setup } = insights;
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const greeting = t(`greeting.${greetingKey(now, timeZone)}`, { name: me.name.split(" ")[0] });
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

  const base = `/locations/${locationId}`;
  const settings = (section: string) => `${base}/settings?section=${section}`;
  const steps: SetupStep[] = [
    { key: "address", done: setup.address, href: settings("shop") },
    { key: "hours", done: setup.openingHours, href: settings("hours") },
    { key: "turnaround", done: setup.turnaround, href: settings("tickets") },
    { key: "reviewLink", done: setup.reviewLink, href: settings("reviews") },
    // The logo is the Business's, which only its Owner edits.
    ...(membership.role === "OWNER"
      ? [{ key: "logo", done: setup.logo, href: `/businesses/${location.businessId}/settings` }]
      : []),
    { key: "team", done: setup.team, href: `${base}/team` },
    { key: "firstTicket", done: setup.firstTicket, href: null },
    { key: "firstHandover", done: setup.firstHandover, href: null },
  ];
  const setupLeft = manager && steps.some((step) => !step.done);

  if (!setup.firstTicket) {
    return (
      <div className="flex flex-col gap-4 lg:gap-5">
        <PageHeader title={greeting} subtitle={date.charAt(0).toUpperCase() + date.slice(1)} />
        {celebration}
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <FirstTicket className={manager ? "lg:col-span-8" : "lg:col-span-12"} />
          {manager && <SetupTile steps={steps} className="lg:col-span-4" />}
        </div>
      </div>
    );
  }

  const ready = tickets.filter(({ currentStatus }) => currentStatus.code === "READY");
  const longest = Math.max(
    0,
    ...ready.map(({ statusSince }) => daysBetween(calendarDateIn(new Date(statusSince), timeZone), today)),
  );
  const latest = Math.max(
    0,
    ...tickets
      .filter(
        ({ estimatedReadyDate, currentStatus }) =>
          expected(estimatedReadyDate, currentStatus.code, today)?.key === "late",
      )
      .map(({ estimatedReadyDate }) => daysBetween(estimatedReadyDate!, today)),
  );
  const summary =
    counts.late > 0
      ? t("summary.late", { count: counts.late })
      : counts.ready > 0
        ? t("summary.ready", { count: counts.ready })
        : counts.dueToday > 0
          ? t("summary.due", { count: counts.dueToday })
          : t("summary.calm");
  const when = (instant: string) =>
    formatMoment(new Date(instant), timeZone, today, locale, (parts) => tDetail("moment", parts));
  const upNext = tickets.slice(0, UP_NEXT);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      {celebration}
      <TodayHero
        greeting={greeting}
        date={date.charAt(0).toUpperCase() + date.slice(1)}
        summary={summary}
        stats={[
          {
            href: `${base}/tickets?view=ready`,
            icon: "check",
            label: t("ready"),
            value: counts.ready,
            sub: counts.ready ? t("longestWait", { days: longest }) : t("nothingReady"),
            tone: "lime",
          },
          {
            href: `${base}/tickets?view=late`,
            icon: "time",
            label: t("late"),
            value: counts.late,
            sub: counts.late ? t("upToLate", { days: latest }) : t("nothingLate"),
            tone: "late",
          },
          {
            href: `${base}/tickets?view=open&sort=expected&dir=asc`,
            icon: "date",
            label: t("dueToday"),
            value: counts.dueToday,
            sub: t("dueTomorrow", { count: counts.dueTomorrow }),
          },
          {
            href: `${base}/tickets?view=open`,
            icon: "settings",
            label: t("inShop"),
            value: counts.inShop,
            sub: t("openCount", { count: counts.open }),
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        {manager ? (
          <MonthTile
            received={insights.received}
            customers={insights.customers}
            className="md:col-span-2 lg:col-span-5"
          />
        ) : (
          <YourDayTile yourDay={insights.yourDay} className="md:col-span-2 lg:col-span-5" />
        )}
        <PromiseTile
          promise={insights.promise}
          settingsHref={manager ? settings("tickets") : null}
          className="lg:col-span-3"
        />
        <UpdatesTile
          updates={insights.updates}
          feedbackHref={manager ? `${base}/feedback` : null}
          className="lg:col-span-4"
        />

        <section
          aria-labelledby="up-next-title"
          className="@container flex flex-col overflow-clip rounded-sheet border border-border bg-surface md:col-span-2 lg:col-span-8"
        >
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 lg:px-7">
            <div>
              <h2 id="up-next-title" className="text-title-h6">
                {t("upNext")}
              </h2>
              <p className="text-p-sm text-muted">{t("upNextHint")}</p>
            </div>
            <Link href={`${base}/tickets`} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {t("allOpen", { count: counts.open })}
              <Icon name="arrow-right" className="size-2.5" />
            </Link>
          </div>
          {upNext.length > 0 ? (
            <ul>
              {upNext.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} locationId={locationId} timeZone={timeZone} today={today} />
              ))}
            </ul>
          ) : (
            <EmptyState illustration="chill" title={t("caughtUpTitle")} description={t("caughtUpBody")} />
          )}
        </section>

        {/* Sized by Up next alone, so neither column stretches into empty space:
            Activity takes what's left and scrolls. */}
        <div className="flex min-h-0 flex-col gap-4 md:col-span-2 lg:col-span-4 lg:gap-5 lg:contain-size">
          {setupLeft && <SetupTile steps={steps} className="shrink-0" />}
          <ActivityTile
            activity={insights.activity}
            locationId={locationId}
            meId={me.id}
            when={when}
            className="max-lg:max-h-[34rem] lg:min-h-64 lg:flex-1"
          />
        </div>
      </div>
    </div>
  );
}
