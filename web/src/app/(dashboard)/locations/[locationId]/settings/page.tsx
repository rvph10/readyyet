import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SheetShell } from "@/components/sheet-shell";
import type { IconName } from "@/components/ui/icon";
import { getMe } from "@/lib/me";
import { getBilling, getLocation, getOverview } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { DeleteLocation } from "./delete-location";
import { OpeningHours } from "./opening-hours";
import { ReviewLink } from "./review-link";
import { parseSection, SETTINGS_SECTIONS, type SettingsSection } from "./settings-views";
import { ShopDetails } from "./shop-details";
import { Turnaround } from "./turnaround";

const ICONS: Record<SettingsSection, IconName> = {
  shop: "home",
  hours: "time",
  tickets: "tag",
  reviews: "comment",
  delete: "info-triangle",
};

// ADR 0100: what a Customer sees of this Location, and how it runs.
export default async function SettingsPage({ params, searchParams }: PageProps<"/locations/[locationId]/settings">) {
  const [{ locationId }, search, me, t, tSettings] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("dashboard"),
    getTranslations("settings"),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const [location, billing, overview] = await Promise.all([
    getLocation(locationId),
    getBilling(locationId),
    getOverview(locationId),
  ]);
  const hasPro = billing.plan === "PRO" && !billing.frozen;
  const owner = membership.role === "OWNER";
  const allowed = SETTINGS_SECTIONS.filter((section) => section !== "delete" || owner);
  const sections: Record<SettingsSection, ReactNode> = {
    shop: <ShopDetails location={location} />,
    hours: <OpeningHours locationId={locationId} hours={location.openingHours} timeZone={location.timeZone} />,
    tickets: (
      <Turnaround
        locationId={locationId}
        days={location.turnaroundDays}
        openingHours={location.openingHours}
        timeZone={location.timeZone}
      />
    ),
    reviews: <ReviewLink locationId={locationId} url={location.googleReviewUrl} hasPro={hasPro} />,
    delete: (
      <DeleteLocation
        locationId={locationId}
        businessId={membership.location.business.id}
        name={location.name}
        openTickets={overview.counts.open}
      />
    ),
  };

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={t("sections.settings")} />
      <SheetShell
        label={tSettings("navLabel")}
        start={parseSection(search.section, allowed)}
        sections={allowed.map((name) => ({
          name,
          icon: ICONS[name],
          label: tSettings(`nav.${name}`),
          // Said in the menu while Customers aren't being asked.
          badge: name === "reviews" && hasPro && !location.googleReviewUrl ? tSettings("off") : undefined,
          danger: name === "delete",
          content: sections[name],
        }))}
      />
    </div>
  );
}
