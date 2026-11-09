import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { LocationCard } from "../location-card";
import { parseStars, STARS } from "../tracking";
import { getTracking, openInTicketLanguage } from "../tracking-data";
import { GoogleChoice } from "./google-choice";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  // The link is the only key to the Ticket (ADR 0013).
  robots: { index: false, follow: false },
};

// ADR 0076: where a star of the feedback email leads. Opening it records
// nothing, mail scanners open every link. ADR 0114: every rating gets the same
// two choices, so nothing about a Customer's answer steers them toward Google.
// ADR 0125: the star they tapped arrives selected, saved once they act.
export default async function ReviewPage({ params, searchParams }: PageProps<"/t/[code]/review">) {
  const [{ code }, query, t] = await Promise.all([params, searchParams, getTranslations("tracking")]);
  const tracking = await getTracking(code);
  const trackingPath = `/t/${encodeURIComponent(code)}`;
  const path = `${trackingPath}/review`;
  const { asksForFeedback, reviewUrl, location, title, feedback } = tracking;
  // Not COMPLETED, or a Location that doesn't ask for feedback (ADR 0039).
  if (!asksForFeedback) {
    redirect(trackingPath);
  }
  const picked = parseStars(query.stars);
  const stars = picked ?? feedback?.stars ?? null;
  const closed = feedback?.closed ?? false;
  await openInTicketLanguage(tracking, picked ? `${path}?stars=${picked}` : path);

  return (
    <LocationCard location={location}>
      <h1 className="text-label-xl md:text-title-h4">{t(closed ? "ratingThanksTitle" : "ratingTitle")}</h1>
      <p className="mt-1 text-p-sm wrap-anywhere text-muted">{title}</p>

      {closed ? (
        <div className="mt-5 flex flex-col gap-6">
          <FormAlert tone="success">{t("feedbackSent")}</FormAlert>
          {/* A closed answer keeps its rating, the API ignores this one. Older
              answers have a message and no stars. */}
          {reviewUrl && <GoogleChoice code={code} reviewUrl={reviewUrl} rating={{ stars: stars ?? 5, tags: [] }} />}
        </div>
      ) : (
        <>
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
          {stars ? (
            <ReviewForm code={code} stars={stars} savedTags={feedback?.tags ?? []} reviewUrl={reviewUrl} />
          ) : (
            <p className="text-p-sm text-muted">{t("ratingPrompt")}</p>
          )}
        </>
      )}

      <p className="mt-6 border-t border-border pt-4 text-p-sm">
        <Link href={trackingPath} className={buttonClass({ variant: "link" })}>
          {t("backToTracking")}
        </Link>
      </p>
    </LocationCard>
  );
}
