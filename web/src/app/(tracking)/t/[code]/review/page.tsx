import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { LocationCard } from "../location-card";
import { parseStars, STARS } from "../tracking";
import { getTracking, openInTicketLanguage } from "../tracking-data";
import { PrivateFeedbackForm } from "./private-feedback-form";

export const metadata: Metadata = {
  // The link is the only key to the Ticket (ADR 0013).
  robots: { index: false, follow: false },
};

// ADR 0076: where a star of the feedback email leads. Opening it records
// nothing, mail scanners open every link. ADR 0114: every rating gets the same
// two choices, so nothing about a Customer's answer steers them toward Google.
export default async function ReviewPage({ params, searchParams }: PageProps<"/t/[code]/review">) {
  const [{ code }, query, t] = await Promise.all([params, searchParams, getTranslations("tracking")]);
  const tracking = await getTracking(code);
  const stars = parseStars(query.stars);
  const trackingPath = `/t/${encodeURIComponent(code)}`;
  const path = `${trackingPath}/review`;

  // Not COMPLETED, or a Location that doesn't ask for feedback (ADR 0039).
  const { reviewUrl, location, title, feedbackSentAt } = tracking;
  if (!reviewUrl) {
    redirect(trackingPath);
  }
  await openInTicketLanguage(tracking, stars ? `${path}?stars=${stars}` : path);

  const googleLink = { href: reviewUrl, target: "_blank", rel: "noopener noreferrer" };

  return (
    <LocationCard location={location}>
      <h1 className="text-label-xl md:text-title-h4">{t(stars ? "ratingThanksTitle" : "ratingTitle")}</h1>
      <p className="mt-1 text-p-sm wrap-anywhere text-muted">{title}</p>

      <nav aria-label={t("starsLabel")} className="my-5 -ml-1.5 flex">
        {STARS.map((star) => (
          <Link
            key={star}
            href={`${path}?stars=${star}`}
            replace
            scroll={false}
            prefetch={false}
            aria-label={t("starLabel", { count: star })}
            aria-current={star === stars ? "true" : undefined}
            className={`flex size-11 items-center justify-center rounded-full text-4xl leading-none transition-colors hover:text-ink ${star <= (stars ?? 0) ? "text-ink" : "text-border-strong"}`}
          >
            ★
          </Link>
        ))}
      </nav>

      {!stars && !feedbackSentAt && <p className="text-p-sm text-muted">{t("ratingPrompt")}</p>}

      {feedbackSentAt && <FormAlert tone="success">{t("feedbackSent")}</FormAlert>}

      {(stars || feedbackSentAt) && (
        <div className={feedbackSentAt ? "mt-5" : undefined}>
          <h2 className="text-label-md">{t("publicReviewTitle")}</h2>
          <p className="mt-1 mb-3 text-p-sm">{t("publicReviewText")}</p>
          <a {...googleLink} className={buttonClass({ variant: "secondary" })}>
            {t("reviewOnGoogle")}
          </a>
        </div>
      )}

      {stars && !feedbackSentAt && (
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-label-md">{t("privateNoteTitle")}</h2>
          <p className="mt-1 mb-3 text-p-sm">{t("privateNoteText")}</p>
          <PrivateFeedbackForm code={code} />
        </div>
      )}

      <p className="mt-6 border-t border-border pt-4 text-p-sm">
        <Link href={trackingPath} className={buttonClass({ variant: "link" })}>
          {t("backToTracking")}
        </Link>
      </p>
    </LocationCard>
  );
}
