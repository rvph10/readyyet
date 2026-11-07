import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusLabel } from "@/lib/status-label";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { JourneySteps } from "./journey-steps";
import { Photos } from "./photos";
import { LocationPanel } from "./location-panel";
import { StatusHero } from "./status-hero";
import { journey, momentFormatter } from "./tracking";
import { getTracking, openInTicketLanguage } from "./tracking-data";
import { TrackingBento, TrackingGrid } from "./tracking-grid";

// A Customer leaves this page open and comes back to it hours later. Inside the
// 15 minutes a photo's presigned URL works (ADR 0026), and rare enough for the
// route's rate limit (ADR 0013).
const REFRESH_EVERY_MS = 5 * 60 * 1000;

export async function generateMetadata({ params }: PageProps<"/t/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [tracking, locale] = await Promise.all([getTracking(code), getLocale()]);
  return {
    title: `${statusLabel(tracking.currentStatus, locale)}, ${tracking.location.name}`,
    // The link is the only key to the Ticket (ADR 0013).
    robots: { index: false, follow: false },
  };
}

export default async function TrackingPage({ params }: PageProps<"/t/[code]">) {
  const { code } = await params;
  const [tracking, locale, t] = await Promise.all([getTracking(code), getLocale(), getTranslations("tracking")]);
  await openInTicketLanguage(tracking, `/t/${encodeURIComponent(code)}`);

  const now = new Date();
  const { location, currentStatus, photos } = tracking;
  const formatMoment = momentFormatter(location.timeZone, locale, now, (time) => t("todayAt", { time }));
  const ready = currentStatus.code === "READY" && !tracking.customerCollectedAt;

  return (
    <TrackingGrid>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <header>
        {location.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={location.bannerUrl} alt="" className="h-28 w-full rounded-sheet object-cover md:h-44" />
        )}
        <div className={`flex items-center gap-3 px-1 ${location.bannerUrl ? "-mt-5 pl-4" : ""}`}>
          <Avatar
            id={location.name}
            name={location.name}
            src={location.logoUrl}
            shape="square"
            size="lg"
            className={location.bannerUrl ? "relative ring-4 ring-canvas" : ""}
          />
          <p className={`min-w-0 text-label-md text-balance wrap-anywhere ${location.bannerUrl ? "pt-5" : ""}`}>
            {location.name}
          </p>
        </div>
      </header>
      <TrackingBento photos={photos.length > 0}>
        <StatusHero tracking={tracking} locale={locale} now={now} className="order-1 lg:order-none" />
        {/* An item that's ready raises "where and when" first, so on a phone
            the Location comes right after the Status. */}
        <LocationPanel
          location={location}
          locale={locale}
          now={now}
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
