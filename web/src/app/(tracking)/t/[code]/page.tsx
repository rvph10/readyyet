import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusLabel } from "@/lib/status-label";
import { getTracking, openInTicketLanguage } from "./tracking-data";
import { TrackingView } from "./tracking-view";

// A Customer leaves this page open and comes back to it hours later. Inside the
// 15 minutes a photo's presigned URL works (ADR 0026), and rare enough for the
// route's rate limit (ADR 0013).
const REFRESH_EVERY_MS = 5 * 60 * 1000;

export async function generateMetadata({ params }: PageProps<"/t/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [tracking, locale, t, requestHeaders] = await Promise.all([
    getTracking(code),
    getLocale(),
    getTranslations("tracking"),
    headers(),
  ]);
  // The same picture for every link, so a forwarded link shows nothing of the
  // Customer, the item or its photos. Absolute, as link previews require, and
  // the web app has no setting for its own address.
  const image = `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("host")}/og/tracking-${locale}.jpg`;
  return {
    title: `${statusLabel(tracking.currentStatus, locale)}, ${tracking.location.name}`,
    // The link is the only key to the Ticket (ADR 0013).
    robots: { index: false, follow: false },
    openGraph: { images: [{ url: image, width: 1200, height: 630, alt: t("shareImageAlt") }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function TrackingPage({ params }: PageProps<"/t/[code]">) {
  const { code } = await params;
  const [tracking, locale] = await Promise.all([getTracking(code), getLocale()]);
  await openInTicketLanguage(tracking, `/t/${encodeURIComponent(code)}`);

  return (
    <TrackingView tracking={tracking} locale={locale} now={new Date()}>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
    </TrackingView>
  );
}
