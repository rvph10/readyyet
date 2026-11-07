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
import { daysBetween, formatMoment, LONG_WAIT_DAYS } from "./tickets/ticket-views";

export async function generateMetadata({ params }: LayoutProps<"/locations/[locationId]">): Promise<Metadata> {
  const [{ locationId }, { memberships }] = await Promise.all([params, getMe()]);
  return { title: memberships.find(({ location }) => location.id === locationId)?.location.name };
}

// ADR 0077: the Location is in the URL, nothing remembers a "current" one, so
// two tabs can show two Locations and an email's link opens the right one.
export default async function LocationLayout({ children, params }: LayoutProps<"/locations/[locationId]">) {
  const [{ locationId }, me, cookieStore, tTickets, tDetail, locale] = await Promise.all([
    params,
    getMe(),
    cookies(),
    getTranslations("tickets"),
    getTranslations("ticketDetail"),
    getLocale(),
  ]);
  const current = me.memberships.find(({ location }) => location.id === locationId);
  if (!current) {
    notFound();
  }
  const manager = isManager(current.role);
  const [location, overview, trialDaysLeft, feedback] = await Promise.all([
    getLocation(locationId),
    getOverview(locationId),
    getDaysToChoosePlan(locationId, current.role),
    manager ? getLatestFeedback(locationId) : [],
  ]);
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
  const owned = current.role === "OWNER" ? await getOwnedBusiness(current.location.business.id) : null;

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
            feedback: feedback.map(({ id, customer: { fullName }, message, createdAt }) => ({
              id,
              name: fullName,
              detail: message,
              shown: moment(createdAt),
            })),
            feedbackCount: manager ? overview.counts.unhandledFeedback : 0,
            collected: overview.tickets.flatMap((ticket) =>
              ticket.customerCollectedAt ? [{ ...customer(ticket), shown: moment(ticket.customerCollectedAt) }] : [],
            ),
            failing: overview.tickets.filter(({ emailFails }) => emailFails).map(customer),
            longWaits: overview.tickets
              .filter(
                (ticket) =>
                  ticket.currentStatus.code === "READY" &&
                  !ticket.customerCollectedAt &&
                  readySince(ticket) >= LONG_WAIT_DAYS,
              )
              .map((ticket) => ({ ...customer(ticket), days: readySince(ticket) })),
          }}
        >
          {children}
        </LocationNav>
      </div>
    </LocationActions>
  );
}
