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
        // Across the top like a cover (ADR 0134): whole at 3:1 on a phone, a
        // lower band on a computer so the Status stays in the first screen.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={location.bannerUrl}
          alt=""
          className="aspect-[3/1] w-full rounded-sheet object-cover lg:aspect-auto lg:h-64"
        />
      )}
      {/* Over the banner's lower edge like a profile picture, ringed in the
          page's colour; the name sits beside it, below the banner. The pull
          up is half the logo plus the grid's gap. A shop's logo comes in any
          shape, so it sits whole on white (ADR 0065); only the demo's, made
          square, fills its square. */}
      <header
        className={`flex gap-3 px-1 ${location.bannerUrl ? "-mt-14 items-end pl-5 lg:-mt-15 lg:pl-7" : "items-center"}`}
      >
        <Avatar
          id={location.name}
          name={location.name}
          src={location.logoUrl}
          shape="square"
          size="xl"
          fill={demo}
          className={location.bannerUrl ? "relative ring-4 ring-canvas" : undefined}
        />
        <p
          className={`min-w-0 text-title-h6 text-balance wrap-anywhere md:text-title-h5 ${location.bannerUrl ? "pb-1" : ""}`}
        >
          {location.name}
        </p>
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
          className={`${ready ? "order-2" : "order-5"} lg:sticky lg:top-5 lg:order-none lg:self-start ${photos.length > 0 ? "lg:row-span-3" : "lg:row-span-2"}`}
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
