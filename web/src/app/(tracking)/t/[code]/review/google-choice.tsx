"use client";

import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { recordGoogleClick, type Rating } from "../actions";

// ADR 0125: the tap is counted for the shop on the way out, never waited on,
// and what the Customer writes on Google is never seen.
export function GoogleChoice({ code, reviewUrl, rating }: { code: string; reviewUrl: string; rating: Rating }) {
  const t = useTranslations("tracking");
  return (
    <div className="border-t border-border pt-5">
      <h2 className="text-label-md">{t("publicReviewTitle")}</h2>
      <p className="mt-0.5 mb-3 text-p-sm text-muted">{t("publicReviewText")}</p>
      <a
        href={reviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void recordGoogleClick(code, rating)}
        className={buttonClass()}
      >
        {t("reviewOnGoogle")}
      </a>
    </div>
  );
}
