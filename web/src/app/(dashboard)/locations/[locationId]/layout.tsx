import { calendarDateIn, turnaroundReadyDate } from "@readyyet/shared";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOwnedBusiness, referralLink } from "@/lib/business";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { LocationActions } from "./location-actions";
import { getDaysToChoosePlan, getLocation, getOverview } from "./location-data";
import { LocationNav } from "./location-nav";

export async function generateMetadata({ params }: LayoutProps<"/locations/[locationId]">): Promise<Metadata> {
  const [{ locationId }, { memberships }] = await Promise.all([params, getMe()]);
  return { title: memberships.find(({ location }) => location.id === locationId)?.location.name };
}

// ADR 0077: the Location is in the URL, nothing remembers a "current" one, so
// two tabs can show two Locations and an email's link opens the right one.
export default async function LocationLayout({ children, params }: LayoutProps<"/locations/[locationId]">) {
  const [{ locationId }, me, cookieStore] = await Promise.all([params, getMe(), cookies()]);
  const current = me.memberships.find(({ location }) => location.id === locationId);
  if (!current) {
    notFound();
  }
  const [location, overview, trialDaysLeft] = await Promise.all([
    getLocation(locationId),
    getOverview(locationId),
    getDaysToChoosePlan(locationId, current.role),
  ]);
  const now = new Date();
  const owned = current.role === "OWNER" ? await getOwnedBusiness(current.location.business.id) : null;

  return (
    <LocationActions
      locationId={locationId}
      timeZone={location.timeZone}
      today={calendarDateIn(now, location.timeZone)}
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
        >
          {children}
        </LocationNav>
      </div>
    </LocationActions>
  );
}
