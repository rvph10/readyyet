import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusLabel } from "@/lib/status-label";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { JourneySteps } from "./journey-steps";
import { Photos } from "./photos";
import { ShopPanel } from "./shop-panel";
import { StatusHero } from "./status-hero";
import { journey, momentFormatter } from "./tracking";
import { getTracking, openInTicketLanguage } from "./tracking-data";
import { TrackingColumn, TrackingColumns, TrackingGrid } from "./tracking-grid";

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
  // The shop's panel alone would be a short one beside a tall column, so on a
  // large screen it joins the Status, opposite the progress.
  const sparse = photos.length === 0 && location.openingHours.length === 0;

  // Whichever ends a column takes up what's left, so both end on one line.
  const progress = (
    <Panel as="section" padding="lg" aria-labelledby="progress-title" className="order-3 flex flex-col lg:flex-1">
      <h2 id="progress-title" className="mb-5 text-label-lg">
        {t("progress")}
      </h2>
      <JourneySteps steps={journey(tracking, locale, formatMoment)} currentCode={currentStatus.code} />
    </Panel>
  );
  // An item that's ready raises "where and when" first, so on a phone the shop
  // comes right after the Status.
  const shop = (
    <ShopPanel
      location={location}
      locale={locale}
      now={now}
      className={`${ready ? "order-2" : "order-5"} lg:order-none ${photos.length === 0 ? "lg:flex-1" : ""}`}
    />
  );

  return (
    <TrackingGrid>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <header className="flex items-center gap-3 px-1">
        <Avatar id={location.name} name={location.name} src={location.logoUrl} shape="square" size="lg" />
        <p className="min-w-0 text-label-md text-balance wrap-anywhere">{location.name}</p>
      </header>
      <TrackingColumns>
        <TrackingColumn>
          <div className="order-1 lg:order-none">
            <StatusHero tracking={tracking} locale={locale} now={now} />
          </div>
          {sparse ? shop : progress}
        </TrackingColumn>
        <TrackingColumn>
          {sparse ? progress : shop}
          {photos.length > 0 && (
            <Panel as="section" padding="lg" aria-labelledby="photos-title" className="order-4 lg:order-none lg:flex-1">
              <h2 id="photos-title" className="mb-4 text-label-lg">
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
        </TrackingColumn>
      </TrackingColumns>
    </TrackingGrid>
  );
}
