import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { JourneySteps } from "./journey-steps";
import { LocationPanel } from "./location-panel";
import { Photos } from "./photos";
import { StatusHero } from "./status-hero";
import { journey, momentFormatter, type Tracking } from "./tracking";
import { TrackingBento, TrackingGrid } from "./tracking-grid";

interface Props {
  tracking: Tracking;
  locale: string;
  now: Date;
  // The demo shows the page without acting on a Ticket: its buttons and links
  // lead nowhere.
  demo?: boolean;
  // Above the page, inside its grid.
  children?: ReactNode;
}

// The Customer's page, shared by a real Ticket's link and the demo, so the
// demo is always the page Customers get.
export async function TrackingView({ tracking, locale, now, demo = false, children }: Props) {
  const t = await getTranslations("tracking");
  const { location, currentStatus, photos } = tracking;
  const formatMoment = momentFormatter(location.timeZone, locale, now, (time) => t("todayAt", { time }));
  const ready = currentStatus.code === "READY" && !tracking.customerCollectedAt;

  return (
    <TrackingGrid>
      {children}
      {location.bannerUrl && (
        // Whole, at 3:1 (ADR 0109). On a computer it's in the shop's tile instead.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={location.bannerUrl} alt="" className="aspect-[3/1] w-full rounded-sheet object-cover lg:hidden" />
      )}
      <header className="flex items-center gap-3 px-1">
        <Avatar id={location.name} name={location.name} src={location.logoUrl} shape="square" size="lg" />
        <p className="min-w-0 text-label-md text-balance wrap-anywhere">{location.name}</p>
      </header>
      <TrackingBento photos={photos.length > 0}>
        <StatusHero tracking={tracking} locale={locale} now={now} demo={demo} className="order-1 lg:order-none" />
        {/* An item that's ready raises "where and when" first, so on a phone
            the Location comes right after the Status. */}
        <LocationPanel
          location={location}
          locale={locale}
          now={now}
          demo={demo}
          className={`${ready ? "order-2" : "order-5"} lg:order-none ${photos.length > 0 ? "lg:row-span-3" : "lg:row-span-2"}`}
        />
        <Panel
          as="section"
          padding="lg"
          aria-labelledby="progress-title"
          className="order-3 flex flex-col lg:order-none lg:col-span-2"
        >
          <h2 id="progress-title" className="mb-6 text-title-h6">
            {t("progress")}
          </h2>
          <div className="my-auto flex flex-col">
            <JourneySteps steps={journey(tracking, locale, formatMoment)} currentCode={currentStatus.code} />
          </div>
        </Panel>
        {photos.length > 0 && (
          <Panel
            as="section"
            padding="lg"
            aria-labelledby="photos-title"
            className="order-4 lg:order-none lg:col-span-2"
          >
            <h2 id="photos-title" className="mb-4 text-title-h6">
              {t("photos")}
            </h2>
            <Photos
              photos={photos.map((photo, index) => ({
                url: photo.url,
                alt: t("photoAlt", { number: index + 1 }),
                caption: t("photoCaption", { date: formatMoment(String(photo.createdAt)) }),
              }))}
            />
          </Panel>
        )}
      </TrackingBento>
    </TrackingGrid>
  );
}
