import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
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
import { Reveal } from "@/components/reveal";

// ADR 0105: a Business is its Locations. What happens in a shop is on that
// shop's Today, so this only says where to go, and what stops one. ADR 0119:
// the hero and the shops' names stand at once, their numbers wait.
export default async function BusinessPage({ params }: PageProps<"/businesses/[businessId]">) {
  const { businessId } = await params;
  const [business, me, t, tToday] = await Promise.all([
    getOwnedBusiness(businessId),
    getMe(),
    getTranslations("business"),
    getTranslations("today"),
  ]);
  const first = [...business.locations].sort((a, b) => a.name.localeCompare(b.name))[0];
  // The greeting follows the clock of the first shop, by name.
  const timeZone = first ? (await getLocation(first.id)).timeZone : "Europe/Brussels";

  return (
    <>
      <BusinessHero
        business={business}
        title={tToday(`greeting.${greetingKey(new Date(), timeZone)}`, { name: me.name.split(" ")[0] })}
        subtitle={`${business.name}, ${t("locationCount", { count: business.locations.length })}`}
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
      {business.locations.length > 0 ? (
        <Reveal
          fallback={
            <BusinessLocations
              loading
              locations={[...business.locations]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(({ id, name }) => ({ id, name, counts: null }))}
            />
          }
        >
          <Shops businessId={businessId} />
        </Reveal>
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

async function Shops({ businessId }: { businessId: string }) {
  const [locations, t] = await Promise.all([getBusinessLocations(businessId), getTranslations("business")]);
  const stopped = stoppedCount(locations);
  return (
    <>
      {stopped > 0 && (
        <Banner tone="error" action={{ href: `/businesses/${businessId}/billing`, label: t("home.seeBilling") }}>
          {t("home.stopped", { count: stopped })}
        </Banner>
      )}
      <BusinessLocations
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
          counts: location.counts,
          // A plan in good order isn't news here, Billing has it (ADR 0110).
          badge: planState(location.billing) !== "active" && <PlanPill location={location} />,
        }))}
      />
    </>
  );
}
