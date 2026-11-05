import { isEndedStatus } from "@readyyet/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShopCard } from "../shop-card";
import { getTracking, openInTicketLanguage } from "../tracking-data";
import { StopUpdates } from "./stop-updates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tracking");
  return {
    title: t("stopTitle"),
    // The link is the only key to the Ticket (ADR 0013).
    robots: { index: false, follow: false },
  };
}

// Opening this records nothing, mail scanners open every link: the Customer
// confirms here (ADR 0015). A mail client's own one-click button goes straight
// to the API instead. The API doesn't say whether updates are already stopped,
// and stopping twice changes nothing, so a second visit simply asks again.
export default async function StopUpdatesPage({ params }: PageProps<"/t/[code]/stop-updates">) {
  const { code } = await params;
  const tracking = await getTracking(code);
  const trackingPath = `/t/${encodeURIComponent(code)}`;
  await openInTicketLanguage(tracking, `${trackingPath}/stop-updates`);

  // The email it would miss is the one the Customer is waiting for.
  const statusCode = tracking.currentStatus.code;
  const stillToBeReady = statusCode !== "READY" && !isEndedStatus(statusCode);

  return (
    <ShopCard location={tracking.location}>
      <StopUpdates code={code} title={tracking.title} stillToBeReady={stillToBeReady} trackingPath={trackingPath} />
    </ShopCard>
  );
}
