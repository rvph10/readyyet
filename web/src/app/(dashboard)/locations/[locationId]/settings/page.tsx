import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { MenuBadge, SheetShell } from "@/components/sheet-shell";
import type { IconName } from "@/components/ui/icon";
import { getMe } from "@/lib/me";
import { getBilling, getLocation, getOverview } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { DeleteLocation } from "./delete-location";
import { ExportData } from "./export-data";
import { OpeningHours } from "./opening-hours";
import { ReviewLink } from "./review-link";
import { SectionLoading } from "./section-form";
import { parseSection, SETTINGS_SECTIONS, type SettingsSection } from "./settings-views";
import { ShopDetails } from "./shop-details";
import { Turnaround } from "./turnaround";
import { Reveal } from "@/components/reveal";

const ICONS: Record<SettingsSection, IconName> = {
  shop: "home",
  hours: "time",
  tickets: "tag",
  reviews: "comment",
  export: "layers",
  delete: "info-triangle",
};

// The heading each section opens with, shown while its fields load.
const HEADINGS: Record<SettingsSection, [title: string, hint: string, groups: number]> = {
  shop: ["nav.shop", "shopHint", 3],
  hours: ["nav.hours", "hoursHint", 2],
  tickets: ["nav.tickets", "ticketsHint", 1],
  reviews: ["nav.reviews", "reviewHint", 1],
  export: ["export.title", "export.hint", 1],
  delete: ["deleteTitle", "deleteHint", 1],
};

// ADR 0100: what a Customer sees of this Location, and how it runs. ADR 0119:
// the sheet and its menu stand at once, each section's fields wait.
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
  const owner = membership.role === "OWNER";
  // The export holds every Customer at once (ADR 0129), deleting is final.
  const allowed = SETTINGS_SECTIONS.filter((section) => (section !== "delete" && section !== "export") || owner);
  const sections: Record<SettingsSection, ReactNode> = {
    shop: <ShopSection locationId={locationId} />,
    hours: <HoursSection locationId={locationId} />,
    tickets: <TicketsSection locationId={locationId} />,
    reviews: <ReviewsSection locationId={locationId} />,
    export: <ExportData locationId={locationId} failed={search.failed === "1"} />,
    delete: <DeleteSection locationId={locationId} businessId={membership.location.business.id} />,
  };

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={t("sections.settings")} />
      <SheetShell
        label={tSettings("navLabel")}
        start={parseSection(search.section, allowed)}
        sections={allowed.map((name) => {
          const [title, hint, groups] = HEADINGS[name];
          return {
            name,
            icon: ICONS[name],
            label: tSettings(`nav.${name}`),
            badge:
              name === "reviews" ? (
                <Suspense>
                  <ReviewsOff locationId={locationId} />
                </Suspense>
              ) : undefined,
            danger: name === "delete",
            content: (
              <Reveal fallback={<SectionLoading title={tSettings(title)} hint={tSettings(hint)} groups={groups} />}>
                {sections[name]}
              </Reveal>
            ),
          };
        })}
      />
    </div>
  );
}

// Said in the menu while Customers aren't emailed for feedback (ADR 0131).
async function ReviewsOff({ locationId }: { locationId: string }) {
  const [location, billing, t] = await Promise.all([
    getLocation(locationId),
    getBilling(locationId),
    getTranslations("settings"),
  ]);
  const hasPro = billing.plan === "PRO" && !billing.frozen;
  return hasPro && !location.feedbackEmails ? <MenuBadge>{t("off")}</MenuBadge> : null;
}

// Both forms start from what is saved. Finding the shop on Google saves an
// address and hours from another section, so a change remounts them, or they
// would keep showing what they first loaded.
async function ShopSection({ locationId }: { locationId: string }) {
  const location = await getLocation(locationId);
  return <ShopDetails key={JSON.stringify(location.address)} location={location} />;
}

async function HoursSection({ locationId }: { locationId: string }) {
  const location = await getLocation(locationId);
  return (
    <OpeningHours
      key={JSON.stringify(location.openingHours)}
      locationId={locationId}
      hours={location.openingHours}
      timeZone={location.timeZone}
    />
  );
}

async function TicketsSection({ locationId }: { locationId: string }) {
  const location = await getLocation(locationId);
  return (
    <Turnaround
      locationId={locationId}
      days={location.turnaroundDays}
      openingHours={location.openingHours}
      timeZone={location.timeZone}
    />
  );
}

async function ReviewsSection({ locationId }: { locationId: string }) {
  const [location, billing] = await Promise.all([getLocation(locationId), getBilling(locationId)]);
  return <ReviewLink location={location} hasPro={billing.plan === "PRO" && !billing.frozen} />;
}

async function DeleteSection({ locationId, businessId }: { locationId: string; businessId: string }) {
  const [location, overview] = await Promise.all([getLocation(locationId), getOverview(locationId)]);
  return (
    <DeleteLocation
      locationId={locationId}
      businessId={businessId}
      name={location.name}
      openTickets={overview.counts.open}
    />
  );
}
