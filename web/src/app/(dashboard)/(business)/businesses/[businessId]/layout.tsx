import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getOwnedBusiness, referralLink } from "@/lib/business";
import { TermsBanner } from "@/components/terms-banner";
import { legalLinks } from "@/lib/legal";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { BusinessNav } from "./business-nav";
import { getBusinessLocations } from "./business-data";
import { stoppedCount } from "./business-views";

export async function generateMetadata({ params }: LayoutProps<"/businesses/[businessId]">): Promise<Metadata> {
  const { businessId } = await params;
  return { title: (await getOwnedBusiness(businessId)).name };
}

// ADR 0102: everything a Business has above its Locations, for its Owner alone.
export default async function BusinessLayout({ children, params }: LayoutProps<"/businesses/[businessId]">) {
  const { businessId } = await params;
  const [me, business, locations, cookieStore, locale] = await Promise.all([
    getMe(),
    getOwnedBusiness(businessId),
    getBusinessLocations(businessId),
    cookies(),
    getLocale(),
  ]);
  // A Business with no Location left isn't in /me, nothing runs to accept for.
  const termsAccepted =
    me.memberships.find(({ location }) => location.business.id === businessId)?.location.business.termsAccepted ?? true;
  return (
    <div className="flex min-h-dvh flex-col">
      <BusinessNav
        me={me}
        business={business}
        memberships={me.memberships}
        locationCount={locations.length}
        billingAlerts={stoppedCount(locations)}
        inviteLink={await referralLink(business.referralCode)}
        collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
      >
        {!termsAccepted && (
          <TermsBanner businessId={businessId} businessName={business.name} legal={legalLinks(locale)} />
        )}
        {children}
      </BusinessNav>
    </div>
  );
}
