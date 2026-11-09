import { calendarDateIn, ERASED_CUSTOMER_NAME, turnaroundReadyDate } from "@readyyet/shared";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOwnedBusiness, referralLink } from "@/lib/business";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { LocationActions } from "./location-actions";
import { getDaysToChoosePlan, getLatestFeedback, getLocation, getOverview } from "./location-data";
import { LocationNav } from "./location-nav";
import { isManager } from "./sections";
import { daysBetween, formatMoment } from "./tickets/ticket-views";

// Enough to work through. The rest come up as these are dealt with, and the bell's
// count still says how many there are.
const MOST_ROWS_OF_A_KIND = 20;

export async function generateMetadata({ params }: LayoutProps<"/locations/[locationId]">): Promise<Metadata> {
  const [{ locationId }, { memberships }] = await Promise.all([params, getMe()]);
  return { title: memberships.find(({ location }) => location.id === locationId)?.location.name };
}

// ADR 0077: the Location is in the URL, nothing remembers a "current" one, so
// two tabs can show two Locations and an email's link opens the right one.
export default async function LocationLayout({ children, params }: LayoutProps<"/locations/[locationId]">) {
  const [{ locationId }, me, cookieStore, tTickets, tDetail, tFeedback, locale] = await Promise.all([
    params,
    getMe(),
    cookies(),
    getTranslations("tickets"),
    getTranslations("ticketDetail"),
    getTranslations("feedback"),
    getLocale(),
  ]);
  const current = me.memberships.find(({ location }) => location.id === locationId);
  if (!current) {
    notFound();
  }
  const manager = isManager(current.role);
  const [location, overview, trialDaysLeft, feedback, owned] = await Promise.all([
    getLocation(locationId),
    getOverview(locationId),
    getDaysToChoosePlan(locationId, current.role),
    manager ? getLatestFeedback(locationId) : [],
    current.role === "OWNER" ? getOwnedBusiness(current.location.business.id) : null,
  ]);
  const { collected, failing, longWaits } = overview.needsYou;
  const now = new Date();
  const today = calendarDateIn(now, location.timeZone);
  const moment = (instant: string) =>
    formatMoment(new Date(instant), location.timeZone, today, locale, (parts) => tDetail("moment", parts));
  const customer = ({ id, title, customer: { fullName } }: (typeof overview.tickets)[number]) => ({
    id,
    name: fullName === ERASED_CUSTOMER_NAME ? tTickets("erasedCustomer") : fullName,
    detail: title,
  });
  const readySince = ({ statusSince }: (typeof overview.tickets)[number]) =>
    daysBetween(calendarDateIn(new Date(statusSince), location.timeZone), today);

  return (
    <LocationActions
      locationId={locationId}
      locationName={location.name}
      timeZone={location.timeZone}
      today={today}
      suggestedDate={
        location.turnaroundDays
          ? turnaroundReadyDate({
              droppedOffAt: now,
              turnaroundDays: location.turnaroundDays,
              timeZone: location.timeZone,
              openingHours: location.openingHours,
            })
          : ""
      }
      locationLocale={location.locale}
      country={location.address?.addressCountry}
      trialDaysLeft={trialDaysLeft}
    >
      <div className="flex min-h-dvh flex-col">
        <LocationNav
          me={me}
          memberships={me.memberships}
          current={current}
          collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
          openTickets={overview.counts.open}
          unhandledFeedback={overview.counts.unhandledFeedback}
          trialDaysLeft={trialDaysLeft}
          inviteLink={owned && (await referralLink(owned.referralCode))}
          needsYou={{
            trialDaysLeft: trialDaysLeft !== null && trialDaysLeft <= 3 ? trialDaysLeft : null,
            feedback: feedback.map(({ id, customer: { fullName }, message, stars, createdAt }) => ({
              id,
              name: fullName,
              // A low rating with no word is a follow-up too (ADR 0125).
              detail: message ?? tFeedback("ratedOnly", { stars: stars! }),
              shown: moment(createdAt),
            })),
            feedbackCount: manager ? overview.counts.unhandledFeedback : 0,
            collected: collected
              .slice(0, MOST_ROWS_OF_A_KIND)
              .map((ticket) => ({ ...customer(ticket), shown: moment(ticket.customerCollectedAt!) })),
            collectedCount: collected.length,
            failing: failing.slice(0, MOST_ROWS_OF_A_KIND).map(customer),
            failingCount: failing.length,
            longWaits: longWaits
              .slice(0, MOST_ROWS_OF_A_KIND)
              .map((ticket) => ({ ...customer(ticket), days: readySince(ticket) })),
            longWaitsCount: longWaits.length,
          }}
        >
          {children}
        </LocationNav>
      </div>
    </LocationActions>
  );
}
