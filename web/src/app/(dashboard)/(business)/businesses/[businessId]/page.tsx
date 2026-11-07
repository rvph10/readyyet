import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AddShopButton } from "@/components/add-shop";
import { BusinessHero } from "@/components/business-hero";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { getOwnedBusiness } from "@/lib/business";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { BusinessLocations } from "./business-locations";
import { getBusinessLocations } from "./business-data";
import { planState, stoppedCount } from "./business-views";
import { PlanPill } from "./plan-pill";

// ADR 0105: a Business is its Locations. What happens in a shop is on that
// shop's Today, so this only says where to go, and what stops one.
export default async function BusinessPage({ params }: PageProps<"/businesses/[businessId]">) {
  const { businessId } = await params;
  const [business, locations, me, t, tToday] = await Promise.all([
    getOwnedBusiness(businessId),
    getBusinessLocations(businessId),
    getMe(),
    getTranslations("business"),
    getTranslations("today"),
  ]);
  const stopped = stoppedCount(locations);

  return (
    <>
      <BusinessHero
        business={business}
        title={tToday(`greeting.${greetingKey(new Date(), locations[0]?.timeZone ?? "Europe/Brussels")}`, {
          name: me.name.split(" ")[0],
        })}
        subtitle={`${business.name}, ${t("locationCount", { count: locations.length })}`}
        corner={
          !business.bannerUrl && (
            <Link
              href={`/businesses/${businessId}/settings`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {t("settings.bannerAdd")}
            </Link>
          )
        }
      >
        <AddShopButton />
      </BusinessHero>
      {stopped > 0 && (
        <Banner tone="error" action={{ href: `/businesses/${businessId}/billing`, label: t("home.seeBilling") }}>
          {t("home.stopped", { count: stopped })}
        </Banner>
      )}
      {locations.length > 0 ? (
        <BusinessLocations
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            counts: location.counts,
            // A plan in good order isn't news here, Billing has it (ADR 0110).
            badge: planState(location.billing) !== "active" && <PlanPill location={location} />,
          }))}
        />
      ) : (
        <Panel padding="none" className="flex flex-1 flex-col">
          <EmptyState
            illustration="box"
            title={t("home.emptyTitle")}
            description={t("home.emptyHint")}
            action={<AddShopButton />}
          />
        </Panel>
      )}
    </>
  );
}
