import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getOwnedBusiness } from "@/lib/business";
import { getMe } from "@/lib/me";
import { groupByBusiness } from "@/lib/memberships";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { BusinessNav } from "./business-nav";
import { getBusinessLocations } from "./business-data";
import { planState } from "./business-views";

export async function generateMetadata({ params }: LayoutProps<"/businesses/[businessId]">): Promise<Metadata> {
  const { businessId } = await params;
  return { title: (await getOwnedBusiness(businessId)).name };
}

// ADR 0102: everything a Business has above its Locations, for its Owner alone.
export default async function BusinessLayout({ children, params }: LayoutProps<"/businesses/[businessId]">) {
  const { businessId } = await params;
  const [me, business, locations, cookieStore] = await Promise.all([
    getMe(),
    getOwnedBusiness(businessId),
    getBusinessLocations(businessId),
    cookies(),
  ]);
  const billingAlerts = locations.filter(({ billing }) => ["paused", "failed"].includes(planState(billing))).length;
  return (
    <div className="flex min-h-dvh">
      <BusinessNav
        me={me}
        business={business}
        locations={locations.map(({ id, name }) => ({ id, name }))}
        otherBusinesses={groupByBusiness(me.memberships)
          .filter((group) => group.owned && group.business.id !== businessId)
          .map((group) => group.business)}
        showAllLocations={me.memberships.length > 1}
        billingAlerts={billingAlerts}
        collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
      >
        {children}
      </BusinessNav>
    </div>
  );
}
