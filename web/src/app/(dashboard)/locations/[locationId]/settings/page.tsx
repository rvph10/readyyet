import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/me";
import { getBilling, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { DeleteLocation } from "./delete-location";
import { OpeningHours } from "./opening-hours";
import { ReviewLink } from "./review-link";
import { SettingsShell } from "./settings-shell";
import { parseSection, SETTINGS_SECTIONS } from "./settings-views";
import { ShopDetails } from "./shop-details";
import { Turnaround } from "./turnaround";

// ADR 0100: what a Customer sees of this Location, and how it runs.
export default async function SettingsPage({ params, searchParams }: PageProps<"/locations/[locationId]/settings">) {
  const [{ locationId }, search, me, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("dashboard"),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const [location, billing] = await Promise.all([getLocation(locationId), getBilling(locationId)]);
  const hasPro = billing.plan === "PRO" && !billing.frozen;
  const owner = membership.role === "OWNER";
  const allowed = SETTINGS_SECTIONS.filter((section) => section !== "delete" || owner);

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={t("sections.settings")} />
      <SettingsShell
        start={parseSection(search.section, allowed)}
        reviewsOff={hasPro && !location.googleReviewUrl}
        sections={{
          shop: <ShopDetails location={location} />,
          hours: <OpeningHours locationId={locationId} hours={location.openingHours} />,
          tickets: (
            <Turnaround
              locationId={locationId}
              days={location.turnaroundDays}
              openingHours={location.openingHours}
              timeZone={location.timeZone}
            />
          ),
          reviews: <ReviewLink locationId={locationId} url={location.googleReviewUrl} hasPro={hasPro} />,
          ...(owner && {
            delete: (
              <DeleteLocation
                locationId={locationId}
                businessId={membership.location.business.id}
                name={location.name}
              />
            ),
          }),
        }}
      />
    </div>
  );
}
