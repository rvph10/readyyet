import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { PickedUpButton } from "../picked-up-button";
import { LocationCard } from "../location-card";
import { getTracking, openInTicketLanguage } from "../tracking-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tracking");
  return {
    title: t("collectedTitle"),
    // The link is the only key to the Ticket (ADR 0013).
    robots: { index: false, follow: false },
  };
}

// Where a reminder's link leads. Opening it records nothing, mail scanners open
// every link: the Customer confirms here (ADR 0037). The question only makes
// sense at READY and not yet answered, otherwise the tracking page already says
// where the Ticket stands, and after confirming it's what thanks them.
export default async function CollectedPage({ params }: PageProps<"/t/[code]/collected">) {
  const [{ code }, t] = await Promise.all([params, getTranslations("tracking")]);
  const tracking = await getTracking(code);
  const trackingPath = `/t/${encodeURIComponent(code)}`;
  if (tracking.currentStatus.code !== "READY" || tracking.customerCollectedAt) {
    redirect(trackingPath);
  }
  await openInTicketLanguage(tracking, `${trackingPath}/collected`);

  return (
    <LocationCard location={tracking.location}>
      <h1 className="text-label-xl text-balance md:text-title-h4">{t("collectedTitle")}</h1>
      <p className="mt-1 text-p-sm wrap-anywhere text-muted">{tracking.title}</p>
      <p className="mt-4 text-p-md">{t("collectedText")}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <PickedUpButton code={code} variant="primary" label={t("collectedConfirm")} />
        <Link href={trackingPath} className={buttonClass({ variant: "secondary" })}>
          {t("collectedNotYet")}
        </Link>
      </div>
    </LocationCard>
  );
}
