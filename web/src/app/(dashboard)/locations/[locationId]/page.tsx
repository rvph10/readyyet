import { calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Reveal } from "@/components/reveal";
import { Banner } from "@/components/ui/banner";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { getBilling, getInsights, getLocation, getOverview } from "./location-data";
import { ActivityTile } from "./overview/activity-tile";
import { FirstTicket } from "./overview/first-ticket";
import { MonthTile } from "./overview/month-tile";
import { PlanCelebration } from "./overview/plan-celebration";
import { SetupGuide } from "./overview/setup-guide";
import { foldedCookie, setupSteps } from "./overview/setup-steps";
import { TodayHero, type HeroStat } from "./overview/today-hero";
import { UpNext } from "./overview/up-next";
import { PageHeader } from "./page-header";
import { parsePlan } from "./plan-prices";
import { isManager } from "./sections";
import { daysBetween, expected, formatMoment, intlLocale } from "./tickets/ticket-views";

// A counter leaves this open all day while colleagues move Tickets.
const REFRESH_EVERY_MS = 60 * 1000;

type Overview = Awaited<ReturnType<typeof getOverview>>;

interface Today {
  locationId: string;
  manager: boolean;
  owner: boolean;
  businessName: string;
  greeting: string;
  date: string;
  timeZone: string;
  today: string;
  when: (instant: string) => string;
  search: Record<string, string | string[] | undefined>;
  folded: string | undefined;
}

// ADR 0116, replacing ADR 0088's grid: a Location opens on a welcome, the day's
// numbers, the month in numbers, what to do next and who did what. ADR 0119: the
// page is drawn at once, each part waiting for its own data in its own tile.
export default async function TodayPage({ params, searchParams }: PageProps<"/locations/[locationId]">) {
  const [{ locationId }, search, t, tDetail, locale, me, cookieJar] = await Promise.all([
    params,
    searchParams,
    getTranslations("today"),
    getTranslations("ticketDetail"),
    getLocale(),
    getMe(),
    cookies(),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership) notFound();
  // Read by the layout already: its time zone sets the date and the greeting.
  const { timeZone } = await getLocation(locationId);
  const now = new Date();
  const today = calendarDateIn(now, timeZone);
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const page: Today = {
    locationId,
    manager: isManager(membership.role),
    owner: membership.role === "OWNER",
    businessName: membership.location.business.name,
    greeting: t(`greeting.${greetingKey(now, timeZone)}`, { name: me.name.split(" ")[0] }),
    date: date.charAt(0).toUpperCase() + date.slice(1),
    timeZone,
    today,
    when: (instant) => formatMoment(new Date(instant), timeZone, today, locale, (parts) => tDetail("moment", parts)),
    search,
    folded: cookieJar.get(foldedCookie(locationId))?.value,
  };

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <Reveal fallback={<Running page={page} overview={null} />}>
        <TodayContent page={page} />
      </Reveal>
    </>
  );
}

// A shop that never had a Ticket has its own page, the rest the day's. Only an
// empty shop has to ask which it is.
async function TodayContent({ page }: { page: Today }) {
  const overview = await getOverview(page.locationId);
  const firstTicket = overview.counts.open > 0 || (await getInsights(page.locationId)).setup.firstTicket;
  if (firstTicket) return <Running page={page} overview={overview} />;
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PageHeader title={page.greeting} subtitle={page.date} />
      <Celebration page={page} />
      {/* The guide's first task is this one, with the rest after it. */}
      {page.manager ? <Guide page={page} empty /> : <FirstTicket />}
    </div>
  );
}

// The day's page, drawn whole from the first paint: without the overview its
// tiles stand empty, and the insights' fill in as they come.
function Running({ page, overview }: { page: Today; overview: Overview | null }) {
  const upNext = (className: string) => (
    <UpNext
      tickets={overview?.tickets ?? null}
      open={overview?.counts.open ?? null}
      locationId={page.locationId}
      timeZone={page.timeZone}
      today={page.today}
      className={className}
    />
  );
  const activityClass = `max-lg:max-h-[34rem] lg:contain-size ${page.manager ? "lg:col-span-5" : "lg:col-span-4"}`;
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {overview && <Celebration page={page} />}
      {overview?.customerEmailsLimited && page.manager && <EmailLimitBanner />}
      <Hero page={page} overview={overview} />
      {overview && page.manager && (
        <Suspense>
          <Guide page={page} />
        </Suspense>
      )}
      {/* An Employee acts on Tickets, so their page is the work and who did what.
          Activity is sized by its neighbour and scrolls, so neither tile
          stretches into empty space. */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        {page.manager && (
          <Waiting
            ready={overview !== null}
            fallback={<MonthTile received={null} customers={null} className="lg:col-span-7" />}
          >
            <Month page={page} />
          </Waiting>
        )}
        {!page.manager && upNext("lg:col-span-8")}
        <Waiting
          ready={overview !== null}
          fallback={
            <ActivityTile activity={null} locationId={page.locationId} when={page.when} className={activityClass} />
          }
        >
          <Activity page={page} className={activityClass} />
        </Waiting>
        {page.manager && upNext("lg:col-span-12")}
      </div>
    </div>
  );
}

// Inside the page's own fallback nothing is asked for yet: the tile only shows
// its empty frame. Once the page is in, it streams on its own.
function Waiting({ ready, fallback, children }: { ready: boolean; fallback: ReactNode; children: ReactNode }) {
  return ready ? <Reveal fallback={fallback}>{children}</Reveal> : fallback;
}

// Not async, so it can stand in the page's fallback without waiting itself.
function Hero({ page, overview }: { page: Today; overview: Overview | null }) {
  const t = useTranslations("today");
  const base = `/locations/${page.locationId}`;
  const counts = overview?.counts;
  const tickets = overview?.tickets ?? [];
  const waitDays = (since: string) => daysBetween(calendarDateIn(new Date(since), page.timeZone), page.today);
  const longest = Math.max(
    0,
    ...tickets
      .filter(({ currentStatus }) => currentStatus.code === "READY")
      .map(({ statusSince }) => waitDays(statusSince)),
  );
  const latest = Math.max(
    0,
    ...tickets
      .filter(
        ({ estimatedReadyDate, currentStatus }) =>
          expected(estimatedReadyDate, currentStatus.code, page.today)?.key === "late",
      )
      .map(({ estimatedReadyDate }) => daysBetween(estimatedReadyDate!, page.today)),
  );
  const summary = !counts
    ? null
    : counts.late > 0
      ? t("summary.late", { count: counts.late })
      : counts.ready > 0
        ? t("summary.ready", { count: counts.ready })
        : counts.dueToday > 0
          ? t("summary.due", { count: counts.dueToday })
          : t("summary.calm");
  const stats: HeroStat[] = [
    {
      href: `${base}/tickets?view=ready`,
      icon: "check",
      label: t("ready"),
      value: counts?.ready ?? null,
      sub: !counts ? null : counts.ready ? t("longestWait", { days: longest }) : t("nothingReady"),
      tone: "lime",
    },
    {
      href: `${base}/tickets?view=late`,
      icon: "time",
      label: t("late"),
      value: counts?.late ?? null,
      sub: !counts ? null : counts.late ? t("upToLate", { days: latest }) : t("nothingLate"),
      tone: "late",
    },
    {
      href: `${base}/tickets?view=open&sort=expected&dir=asc`,
      icon: "date",
      label: t("dueToday"),
      value: counts?.dueToday ?? null,
      sub: counts ? t("dueTomorrow", { count: counts.dueTomorrow }) : null,
    },
    {
      href: `${base}/tickets?view=open`,
      icon: "settings",
      label: t("inShop"),
      value: counts?.inShop ?? null,
      sub: counts ? t("openCount", { count: counts.open }) : null,
    },
  ];
  return <TodayHero greeting={page.greeting} date={page.date} summary={summary} stats={stats} />;
}

async function Month({ page }: { page: Today }) {
  const { received, customers } = await getInsights(page.locationId);
  return <MonthTile received={received} customers={customers} className="lg:col-span-7" />;
}

async function Activity({ page, className }: { page: Today; className: string }) {
  const { activity } = await getInsights(page.locationId);
  return <ActivityTile activity={activity} locationId={page.locationId} when={page.when} className={className} />;
}

// ADR 0117: a manager's, until the shop is fully set up.
async function Guide({ page, empty = false }: { page: Today; empty?: boolean }) {
  const [location, { setup }, billing] = await Promise.all([
    getLocation(page.locationId),
    getInsights(page.locationId),
    getBilling(page.locationId),
  ]);
  if (!setupSteps(setup, page.owner).some(({ isDone }) => !isDone)) return empty ? <FirstTicket sample /> : null;
  return (
    <SetupGuide
      location={location}
      businessName={page.businessName}
      setup={setup}
      owner={page.owner}
      hasPro={billing.hasPro}
      frozen={billing.frozen}
      // A shop already taking Tickets has its day to see first, an empty one
      // has nothing else: until someone folds or opens it themselves.
      folded={(page.folded ?? (setup.firstTicket ? "1" : "0")) === "1"}
    />
  );
}

// ADR 0140: the day's emails to Customers stopped, nothing else did.
function EmailLimitBanner() {
  const t = useTranslations("today");
  return <Banner tone="error">{t("emailLimit")}</Banner>;
}

// After Checkout. The webhook can still be on its way, but the trial's end
// doesn't change with it. Only Checkout knows if the trial was kept: too near
// its end, the card is charged at once.
async function Celebration({ page }: { page: Today }) {
  if (!page.manager || page.search.checkout !== "success") return null;
  const [location, billing, locale] = await Promise.all([
    getLocation(page.locationId),
    getBilling(page.locationId),
    getLocale(),
  ]);
  const trialEnd = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null;
  return (
    <PlanCelebration
      locationId={page.locationId}
      locationName={location.name}
      plan={parsePlan(page.search.plan)}
      firstPayment={
        page.search.trial === "kept" && trialEnd && trialEnd > new Date()
          ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: page.timeZone }).format(trialEnd)
          : null
      }
    />
  );
}
